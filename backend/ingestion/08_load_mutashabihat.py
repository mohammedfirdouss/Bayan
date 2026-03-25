"""Load repeated Quranic phrases from Mutashabihat ul Quran data."""
import json
import os
from pathlib import Path

import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))
MUTASHABIHAT_DIR = QURAN_DATA / "Mutashabihat ul Quran"

BATCH_SIZE = 200


def main() -> None:
    with open(MUTASHABIHAT_DIR / "phrases.json", encoding="utf-8") as f:
        phrases = json.load(f)

    phrase_rows = []
    occurrence_rows = []

    for phrase_id_str, item in phrases.items():
        phrase_id = int(phrase_id_str)
        source = item.get("source", {})
        source_key = source.get("key")
        word_start = source.get("from")
        word_end = source.get("to")
        count = item.get("count", 0)

        phrase_rows.append((phrase_id, count, source_key, word_start, word_end))

        # occurrences are in item["ayah"]: {verse_key: [[start, end], ...]}
        for verse_key, word_ranges in item.get("ayah", {}).items():
            occurrence_rows.append((
                phrase_id,
                verse_key,
                json.dumps(word_ranges),
            ))

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Insert phrases
            before_p = cur.execute("SELECT COUNT(*) FROM mutashabihat_phrases").fetchone()[0]
            cur.executemany(
                """
                INSERT INTO mutashabihat_phrases
                    (id, occurrence_count, source_key, word_range_start, word_range_end)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                phrase_rows,
            )
            after_p = cur.execute("SELECT COUNT(*) FROM mutashabihat_phrases").fetchone()[0]

            # Insert occurrences in batches — filter to verse_keys that exist in DB
            existing_keys: set[str] = {
                row[0]
                for row in cur.execute("SELECT verse_key FROM verses").fetchall()
            }
            valid_occurrences = [
                r for r in occurrence_rows if r[1] in existing_keys
            ]

            before_o = cur.execute("SELECT COUNT(*) FROM mutashabihat_occurrences").fetchone()[0]
            for i in range(0, len(valid_occurrences), BATCH_SIZE):
                cur.executemany(
                    """
                    INSERT INTO mutashabihat_occurrences
                        (phrase_id, verse_key, word_ranges)
                    VALUES (%s, %s, %s::jsonb)
                    ON CONFLICT DO NOTHING
                    """,
                    valid_occurrences[i : i + BATCH_SIZE],
                )
            after_o = cur.execute("SELECT COUNT(*) FROM mutashabihat_occurrences").fetchone()[0]

        conn.commit()

    print(
        f"[08] Loaded {after_p - before_p} phrases, "
        f"{after_o - before_o} occurrences"
    )


if __name__ == "__main__":
    main()
