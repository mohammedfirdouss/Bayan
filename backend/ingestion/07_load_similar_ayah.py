"""Load pre-computed verse similarity data from matching-ayah.json."""
import json
import os
from pathlib import Path

import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))

BATCH_SIZE = 500


def main() -> None:
    path = QURAN_DATA / "Similar Ayah" / "matching-ayah.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for source_key, matches in data.items():
        for m in matches:
            rows.append((
                source_key,
                m["matched_ayah_key"],
                m["score"],
                m["coverage"],
                json.dumps(m.get("match_words", [])),
            ))

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            before = cur.execute("SELECT COUNT(*) FROM verse_similarities").fetchone()[0]
            for i in range(0, len(rows), BATCH_SIZE):
                cur.executemany(
                    """
                    INSERT INTO verse_similarities
                        (source_key, matched_key, score, coverage, match_words)
                    VALUES (%s, %s, %s, %s, %s::jsonb)
                    ON CONFLICT DO NOTHING
                    """,
                    rows[i : i + BATCH_SIZE],
                )
            after = cur.execute("SELECT COUNT(*) FROM verse_similarities").fetchone()[0]
        conn.commit()

    print(f"[07] Loaded {after - before} similarity pairs (total: {after})")


if __name__ == "__main__":
    main()
