"""
Generate and store vector embeddings for all 6,236 Quranic verses using Gemini.

Three embedding types per verse:
  - composite    : arabic + english translation + tafsir excerpt (primary search)
  - arabic_only  : arabic text only (Arabic-language queries)
  - translation  : English translation only (pure English queries)

Also generates chunked embeddings for Ibn Kathir tafsir entries.

Resumable: skips verses that already have embeddings for a given type.
Rate limit: gemini-embedding-001 free tier = 100 RPM. Batches are processed
sequentially with a gap to stay under the limit.
"""
import asyncio
import os

import asyncpg
from google import genai
from google.genai.errors import ClientError
from pgvector.asyncpg import register_vector

DATABASE_URL = os.environ["DATABASE_URL"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]

MODEL = "gemini-embedding-001"
DIMENSIONS = 768
BATCH_SIZE = 50
REQUEST_GAP = 0.7   # seconds between requests → ~85 RPM, under 100 RPM free tier

TAFSIR_SLUG = "ibn-kathir"
CHUNK_WORDS = int(400 / 1.3)
OVERLAP_WORDS = int(50 / 1.3)

client = genai.Client(api_key=GEMINI_API_KEY)


def chunk_text(text: str) -> list[str]:
    words = text.split()
    if len(words) <= CHUNK_WORDS:
        return [text]
    chunks = []
    i = 0
    while i < len(words):
        chunks.append(" ".join(words[i : i + CHUNK_WORDS]))
        i += CHUNK_WORDS - OVERLAP_WORDS
    return chunks


def batched(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a batch, retrying on 429 with the API-suggested wait time."""
    for attempt in range(6):
        try:
            response = await client.aio.models.embed_content(
                model=MODEL,
                contents=texts,
                config={"output_dimensionality": DIMENSIONS},
            )
            await asyncio.sleep(REQUEST_GAP)
            return [e.values or [] for e in (response.embeddings or [])]
        except ClientError as e:
            if e.code == 429:
                # Extract retry delay from error message if present
                import re
                match = re.search(r"retry in (\d+)", str(e))
                wait = int(match.group(1)) + 2 if match else 60 * (attempt + 1)
                print(f"\n  [rate limit] waiting {wait}s (attempt {attempt + 1})...")
                await asyncio.sleep(wait)
            else:
                raise
    raise RuntimeError("Max retries exceeded for embed_batch")


async def load_verse_data(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch("""
        SELECT
            v.verse_key,
            v.text_arabic,
            t.text          AS translation,
            tf.text_plain   AS tafsir_plain
        FROM verses v
        LEFT JOIN translations t
            ON t.verse_key = v.verse_key
            AND t.translator_slug = 'sahih-international'
        LEFT JOIN tafsirs tf
            ON tf.verse_key = v.verse_key
            AND tf.tafsir_slug = 'ibn-kathir'
        ORDER BY v.id
    """)
    return [dict(r) for r in rows]


def build_composite(row: dict) -> str:
    parts = [row["text_arabic"] or ""]
    if row["translation"]:
        parts.append(row["translation"])
    if row["tafsir_plain"]:
        excerpt = row["tafsir_plain"][:400].rsplit(" ", 1)[0]
        parts.append(excerpt)
    return "\n".join(parts)


async def embed_verses(pool: asyncpg.Pool) -> None:
    print("\n[Verse Embeddings]")

    existing = await pool.fetch(
        "SELECT verse_key, embedding_type FROM verse_embeddings WHERE model = $1", MODEL
    )
    done: dict[str, set] = {}
    for row in existing:
        done.setdefault(row["verse_key"], set()).add(row["embedding_type"])

    all_verses = await load_verse_data(pool)

    embedding_types = {
        "composite":   build_composite,
        "arabic_only": lambda r: r["text_arabic"] or "",
        "translation": lambda r: r["translation"] or "",
    }

    for emb_type, text_fn in embedding_types.items():
        pending = [v for v in all_verses if emb_type not in done.get(v["verse_key"], set())]
        if not pending:
            print(f"  {emb_type}: already complete, skipping.")
            continue

        total = len(pending)
        batches = list(batched(pending, BATCH_SIZE))
        print(f"  {emb_type}: {total} verses in {len(batches)} batches...")
        inserted = 0

        for i, batch in enumerate(batches, 1):
            texts = [text_fn(v) for v in batch]
            vectors = await embed_batch(texts)
            async with pool.acquire() as conn:
                await conn.executemany(
                    """
                    INSERT INTO verse_embeddings
                        (verse_key, embedding_type, model, dimensions, embedding)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT DO NOTHING
                    """,
                    [(v["verse_key"], emb_type, MODEL, DIMENSIONS, vec)
                     for v, vec in zip(batch, vectors)],
                )
            inserted += len(batch)
            print(f"  {emb_type}: {inserted}/{total}", end="\r", flush=True)

        print(f"  {emb_type}: {inserted} embeddings inserted.    ")


async def embed_tafsir_chunks(pool: asyncpg.Pool) -> None:
    print("\n[Tafsir Chunk Embeddings — Ibn Kathir]")

    existing_keys = {
        row["verse_key"]
        for row in await pool.fetch(
            "SELECT DISTINCT verse_key FROM tafsir_embeddings WHERE tafsir_slug = $1",
            TAFSIR_SLUG,
        )
    }

    tafsir_rows = await pool.fetch("""
        SELECT verse_key, text_plain FROM tafsirs
        WHERE tafsir_slug = $1 AND text_plain IS NOT NULL AND text_plain != ''
        ORDER BY verse_key
    """, TAFSIR_SLUG)

    pending = [r for r in tafsir_rows if r["verse_key"] not in existing_keys]
    if not pending:
        print("  Already complete, skipping.")
        return

    all_chunks: list[tuple[str, int, str]] = []
    for row in pending:
        for idx, chunk in enumerate(chunk_text(row["text_plain"])):
            all_chunks.append((row["verse_key"], idx, chunk))

    total_chunks = len(all_chunks)
    batches = list(batched(all_chunks, BATCH_SIZE))
    print(f"  {len(pending)} tafsirs → {total_chunks} chunks in {len(batches)} batches...")
    inserted = 0

    for i, batch in enumerate(batches, 1):
        texts = [c[2] for c in batch]
        vectors = await embed_batch(texts)
        async with pool.acquire() as conn:
            await conn.executemany(
                """
                INSERT INTO tafsir_embeddings
                    (verse_key, tafsir_slug, chunk_index, embedding)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
                """,
                [(vk, TAFSIR_SLUG, idx, vec)
                 for (vk, idx, _), vec in zip(batch, vectors)],
            )
        inserted += len(batch)
        print(f"  tafsir chunks: {inserted}/{total_chunks}", end="\r", flush=True)

    print(f"  tafsir chunks: {inserted} inserted.    ")


async def main() -> None:
    print(f"Model: {MODEL} ({DIMENSIONS}d)")
    print(f"Batch size: {BATCH_SIZE} | Gap: {REQUEST_GAP}s (~{int(60/REQUEST_GAP)} RPM)")

    pool = await asyncpg.create_pool(DATABASE_URL, init=register_vector)

    try:
        await embed_verses(pool)
        await embed_tafsir_chunks(pool)
    finally:
        await pool.close()

    conn = await asyncpg.connect(DATABASE_URL)
    await register_vector(conn)
    try:
        counts = await conn.fetch("""
            SELECT embedding_type, COUNT(*) AS n
            FROM verse_embeddings WHERE model = $1
            GROUP BY embedding_type ORDER BY embedding_type
        """, MODEL)
        tafsir_count = await conn.fetchval(
            "SELECT COUNT(*) FROM tafsir_embeddings WHERE tafsir_slug = $1",
            TAFSIR_SLUG,
        )
    finally:
        await conn.close()

    print("\n── Summary ──────────────────────────────")
    for row in counts:
        print(f"  verse_embeddings [{row['embedding_type']}]: {row['n']}")
    print(f"  tafsir_embeddings [{TAFSIR_SLUG}]: {tafsir_count}")
    print("─────────────────────────────────────────")
    print("[10] Embedding generation complete.")


if __name__ == "__main__":
    asyncio.run(main())
