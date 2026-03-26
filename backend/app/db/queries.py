import asyncpg

from app.db.pool import get_pool


HYBRID_SEARCH_SQL = """
WITH semantic AS (
    SELECT
        ve.verse_key,
        1 - (ve.embedding <=> $1::vector) AS semantic_score
    FROM verse_embeddings ve
    WHERE ve.embedding_type = 'composite'
      AND ve.model = 'text-embedding-3-large'
    ORDER BY ve.embedding <=> $1::vector
    LIMIT 50
),
keyword AS (
    SELECT
        t.verse_key,
        ts_rank_cd(
            to_tsvector('english', t.text),
            plainto_tsquery('english', $2)
        ) * 30 AS keyword_score
    FROM translations t
    WHERE t.language = 'en'
      AND to_tsvector('english', t.text) @@ plainto_tsquery('english', $2)
    LIMIT 50
),
combined AS (
    SELECT
        COALESCE(s.verse_key, k.verse_key) AS verse_key,
        COALESCE(s.semantic_score * 0.65, 0)
        + COALESCE(k.keyword_score, 0)      AS hybrid_score
    FROM semantic s
    FULL OUTER JOIN keyword k USING (verse_key)
)
SELECT
    c.verse_key,
    c.hybrid_score,
    v.text_arabic,
    v.ayah_number,
    v.surah_number,
    v.juz,
    s.name_simple                                                        AS surah_name,
    s.name_arabic                                                        AS surah_name_arabic,
    tr.text                                                              AS translation,
    tf.text_plain                                                        AS tafsir_plain,
    tf.text_html                                                         AS tafsir_html,
    array_agg(DISTINCT top.name) FILTER (WHERE top.name IS NOT NULL)    AS topics
FROM combined c
JOIN verses v       ON c.verse_key = v.verse_key
JOIN surahs s       ON v.surah_number = s.id
LEFT JOIN translations tr
    ON tr.verse_key = c.verse_key AND tr.translator_slug = 'sahih-international'
LEFT JOIN tafsirs tf
    ON tf.verse_key = c.verse_key AND tf.tafsir_slug = $3
LEFT JOIN verse_topics vt ON vt.verse_key = c.verse_key
LEFT JOIN topics top      ON top.id = vt.topic_id
GROUP BY
    c.verse_key, c.hybrid_score, v.text_arabic, v.ayah_number,
    v.surah_number, v.juz, s.name_simple, s.name_arabic,
    tr.text, tf.text_plain, tf.text_html
ORDER BY c.hybrid_score DESC
LIMIT $4
"""

HYBRID_SEARCH_TOPIC_SQL = """
WITH semantic AS (
    SELECT
        ve.verse_key,
        1 - (ve.embedding <=> $1::vector) AS semantic_score
    FROM verse_embeddings ve
    WHERE ve.embedding_type = 'composite'
      AND ve.model = 'text-embedding-3-large'
      AND ve.verse_key IN (
          SELECT vt2.verse_key FROM verse_topics vt2
          JOIN topics top2 ON top2.id = vt2.topic_id
          WHERE lower(top2.name) = lower($5)
      )
    ORDER BY ve.embedding <=> $1::vector
    LIMIT 50
),
keyword AS (
    SELECT
        t.verse_key,
        ts_rank_cd(
            to_tsvector('english', t.text),
            plainto_tsquery('english', $2)
        ) * 30 AS keyword_score
    FROM translations t
    WHERE t.language = 'en'
      AND to_tsvector('english', t.text) @@ plainto_tsquery('english', $2)
      AND t.verse_key IN (
          SELECT vt2.verse_key FROM verse_topics vt2
          JOIN topics top2 ON top2.id = vt2.topic_id
          WHERE lower(top2.name) = lower($5)
      )
    LIMIT 50
),
combined AS (
    SELECT
        COALESCE(s.verse_key, k.verse_key) AS verse_key,
        COALESCE(s.semantic_score * 0.65, 0)
        + COALESCE(k.keyword_score, 0)      AS hybrid_score
    FROM semantic s
    FULL OUTER JOIN keyword k USING (verse_key)
)
SELECT
    c.verse_key,
    c.hybrid_score,
    v.text_arabic,
    v.ayah_number,
    v.surah_number,
    v.juz,
    s.name_simple                                                        AS surah_name,
    s.name_arabic                                                        AS surah_name_arabic,
    tr.text                                                              AS translation,
    tf.text_plain                                                        AS tafsir_plain,
    tf.text_html                                                         AS tafsir_html,
    array_agg(DISTINCT top.name) FILTER (WHERE top.name IS NOT NULL)    AS topics
FROM combined c
JOIN verses v       ON c.verse_key = v.verse_key
JOIN surahs s       ON v.surah_number = s.id
LEFT JOIN translations tr
    ON tr.verse_key = c.verse_key AND tr.translator_slug = 'sahih-international'
LEFT JOIN tafsirs tf
    ON tf.verse_key = c.verse_key AND tf.tafsir_slug = $3
LEFT JOIN verse_topics vt ON vt.verse_key = c.verse_key
LEFT JOIN topics top      ON top.id = vt.topic_id
GROUP BY
    c.verse_key, c.hybrid_score, v.text_arabic, v.ayah_number,
    v.surah_number, v.juz, s.name_simple, s.name_arabic,
    tr.text, tf.text_plain, tf.text_html
ORDER BY c.hybrid_score DESC
LIMIT $4
"""


async def hybrid_search(
    query_vector: list[float],
    query_text: str,
    tafsir_slug: str,
    top_k: int,
    topic: str | None = None,
    revelation_place: str | None = None,
    juz: int | None = None,
) -> list[asyncpg.Record]:
    pool = get_pool()
    async with pool.acquire() as conn:
        if topic:
            rows = await conn.fetch(
                HYBRID_SEARCH_TOPIC_SQL,
                query_vector, query_text, tafsir_slug, top_k, topic,
            )
        else:
            rows = await conn.fetch(
                HYBRID_SEARCH_SQL,
                query_vector, query_text, tafsir_slug, top_k,
            )

    # Apply post-filter for revelation_place and juz (small result set, fine in Python)
    if revelation_place or juz:
        rows = await _apply_filters(rows, revelation_place, juz)

    return rows


async def _apply_filters(
    rows: list[asyncpg.Record],
    revelation_place: str | None,
    juz: int | None,
) -> list[asyncpg.Record]:
    if not rows:
        return rows
    verse_keys = [r["verse_key"] for r in rows]
    pool = get_pool()
    async with pool.acquire() as conn:
        conditions = ["v.verse_key = ANY($1::text[])"]
        params: list = [verse_keys]
        if revelation_place:
            conditions.append(f"s.revelation_place = ${len(params) + 1}")
            params.append(revelation_place)
        if juz is not None:
            conditions.append(f"v.juz = ${len(params) + 1}")
            params.append(juz)
        allowed = {
            r["verse_key"]
            for r in await conn.fetch(
                f"""
                SELECT v.verse_key FROM verses v
                JOIN surahs s ON v.surah_number = s.id
                WHERE {" AND ".join(conditions)}
                """,
                *params,
            )
        }
    return [r for r in rows if r["verse_key"] in allowed]


async def get_similar_verses(verse_key: str, limit: int = 3) -> list[str]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT matched_key FROM verse_similarities
            WHERE source_key = $1
            ORDER BY score DESC
            LIMIT $2
            """,
            verse_key, limit,
        )
    return [r["matched_key"] for r in rows]


async def get_verse(verse_key: str) -> asyncpg.Record | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT
                v.verse_key, v.text_arabic, v.ayah_number, v.surah_number, v.juz,
                s.name_simple AS surah_name, s.name_arabic AS surah_name_arabic,
                t.text AS translation,
                tf.text_plain AS tafsir_plain, tf.text_html AS tafsir_html
            FROM verses v
            JOIN surahs s ON v.surah_number = s.id
            LEFT JOIN translations t
                ON t.verse_key = v.verse_key AND t.translator_slug = 'sahih-international'
            LEFT JOIN tafsirs tf
                ON tf.verse_key = v.verse_key AND tf.tafsir_slug = 'ibn-kathir'
            WHERE v.verse_key = $1
            """,
            verse_key,
        )
