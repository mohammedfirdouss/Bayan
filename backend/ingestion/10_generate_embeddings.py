"""
Generate and store vector embeddings for all 6,236 Quranic verses.

Three embedding types per verse:
  - composite    : arabic + english translation + tafsir excerpt (primary search)
  - arabic_only  : arabic text only (Arabic-language queries)
  - translation  : English translation only (pure English queries)

Also generates chunked embeddings for Ibn Kathir tafsir entries.

Resumable: skips verses that already have embeddings for a given type.
Cost: ~$1.50 one-time for the full corpus with text-embedding-3-large.
"""
import asyncio
import os
import re
from typing import AsyncGenerator

import asyncpg
from openai import AsyncOpenAI
from pgvector.asyncpg import register_vector

DATABASE_URL = os.environ["DATABASE_URL"]

MODEL = "text-embedding-3-large"
DIMENSIONS = 3072
BATCH_SIZE = 100
SEMAPHORE_LIMIT = 5

TAFSIR_SLUG = "ibn-kathir"
CHUNK_WORDS = int(400 / 1.3)   # ~400 tokens → ~308 words
OVERLAP_WORDS = int(50 / 1.3)  # ~50 tokens  → ~38 words

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
sem = asyncio.Semaphore(SEMAPHORE_LIMIT)


# Helpers
def chunk_text(text: str) -> list[str]:
    """Split text into overlapping word-based chunks."""
    words = text.split()
    if len(words) <= CHUNK_WORDS:
        return [text]

    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + CHUNK_WORDS])
        chunks.append(chunk)
        i += CHUNK_WORDS - OVERLAP_WORDS
    return chunks


def batched(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Call OpenAI embeddings API with semaphore-limited concurrency."""
    async with sem:
        response = await client.embeddings.create(
            input=texts,
            model=MODEL,
            dimensions=DIMENSIONS,
        )
    return [item.embedding for item in response.data]


# Verse embeddings
async def load_verse_data(pool: asyncpg.Pool) -> list[dict]:
    """Load verses with their translations and tafsir excerpts."""
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
        # First 400 chars of tafsir for context without overwhelming the embedding
        excerpt = row["tafsir_plain"][:400].rsplit(" ", 1)[0]
        parts.append(excerpt)
    return "\n".join(parts)


async def embed_verses(pool: asyncpg.Pool) -> None:
    print("\n[Verse Embeddings]")

    # Find which verse_keys already have all three types
    existing = await pool.fetch("""
        SELECT verse_key, embedding_type FROM verse_embeddings
        WHERE model = $1
    """, MODEL)
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
        pending = [
            v for v in all_verses
            if emb_type not in done.get(v["verse_key"], set())
        ]
        if not pending:
            print(f"  {emb_type}: already complete, skipping.")
            continue

        print(f"  {emb_type}: embedding {len(pending)} verses...")
        inserted = 0

        tasks = []
        for batch in batched(pending, BATCH_SIZE):
            texts = [text_fn(v) for v in batch]
            tasks.append((batch, texts))

        async def process_batch(verse_batch, texts, etype=emb_type):
            vectors = await embed_batch(texts)
            async with pool.acquire() as conn:
                await conn.executemany(
                    """
                    INSERT INTO verse_embeddings
                        (verse_key, embedding_type, model, dimensions, embedding)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (v["verse_key"], etype, MODEL, DIMENSIONS, vec)
                        for v, vec in zip(verse_batch, vectors)
                    ],
                )
            return len(verse_batch)

        results = await asyncio.gather(*[
            process_batch(batch, texts) for batch, texts in tasks
        ])
        inserted = sum(results)
        print(f"  {emb_type}: inserted {inserted} embeddings.")


# Tafsir chunk embeddings
async def embed_tafsir_chunks(pool: asyncpg.Pool) -> None:
    print("\n[Tafsir Chunk Embeddings — Ibn Kathir]")

    # Load tafsir entries not yet embedded
    existing_keys = {
        row["verse_key"]
        for row in await pool.fetch(
            "SELECT DISTINCT verse_key FROM tafsir_embeddings WHERE tafsir_slug = $1",
            TAFSIR_SLUG,
        )
    }

    tafsir_rows = await pool.fetch("""
        SELECT verse_key, text_plain
        FROM tafsirs
        WHERE tafsir_slug = $1 AND text_plain IS NOT NULL AND text_plain != ''
        ORDER BY verse_key
    """, TAFSIR_SLUG)

    pending = [r for r in tafsir_rows if r["verse_key"] not in existing_keys]
    if not pending:
        print("  Already complete, skipping.")
        return

    print(f"  Chunking and embedding {len(pending)} tafsir entries...")

    # Build all (verse_key, chunk_index, text) triples
    all_chunks: list[tuple[str, int, str]] = []
    for row in pending:
        for idx, chunk in enumerate(chunk_text(row["text_plain"])):
            all_chunks.append((row["verse_key"], idx, chunk))

    print(f"  Total chunks: {len(all_chunks)}")

    async def process_chunk_batch(chunk_batch):
        texts = [c[2] for c in chunk_batch]
        vectors = await embed_batch(texts)
        async with pool.acquire() as conn:
            await conn.executemany(
                """
                INSERT INTO tafsir_embeddings
                    (verse_key, tafsir_slug, chunk_index, embedding)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
                """,
                [
                    (vk, TAFSIR_SLUG, idx, vec)
                    for (vk, idx, _), vec in zip(chunk_batch, vectors)
                ],
            )
        return len(chunk_batch)

    tasks = [
        process_chunk_batch(batch)
        for batch in batched(all_chunks, BATCH_SIZE)
    ]
    results = await asyncio.gather(*tasks)
    print(f"  Inserted {sum(results)} tafsir chunk embeddings.")


# Entry point

async def main() -> None:
    print(f"Model: {MODEL} ({DIMENSIONS}d)")
    print(f"Batch size: {BATCH_SIZE} | Concurrency: {SEMAPHORE_LIMIT}")

    pool = await asyncpg.create_pool(DATABASE_URL, init=register_vector)

    try:
        await embed_verses(pool)
        await embed_tafsir_chunks(pool)
    finally:
        await pool.close()

    # Final counts
    async with asyncpg.connect(DATABASE_URL, init=register_vector) as conn:
        await register_vector(conn)
        counts = await conn.fetch("""
            SELECT embedding_type, COUNT(*) AS n
            FROM verse_embeddings
            WHERE model = $1
            GROUP BY embedding_type
            ORDER BY embedding_type
        """, MODEL)
        tafsir_count = await conn.fetchval(
            "SELECT COUNT(*) FROM tafsir_embeddings WHERE tafsir_slug = $1",
            TAFSIR_SLUG,
        )

    print("\n── Summary ──────────────────────────────")
    for row in counts:
        print(f"  verse_embeddings [{row['embedding_type']}]: {row['n']}")
    print(f"  tafsir_embeddings [{TAFSIR_SLUG}]:  {tafsir_count}")
    print("─────────────────────────────────────────")
    print("[10] Embedding generation complete.")


if __name__ == "__main__":
    asyncio.run(main())
