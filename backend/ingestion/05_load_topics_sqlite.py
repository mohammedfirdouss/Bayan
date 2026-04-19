"""Migrate topics from SQLite topics.db into PostgreSQL topics and verse_topics tables."""
import os
import sqlite3
from pathlib import Path

import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))
SQLITE_PATH = QURAN_DATA / "Topics and Concepts in Quran" / "topics.db" / "topics.db"

BATCH_SIZE = 500


def main() -> None:
    if not SQLITE_PATH.exists():
        print(f"[05] WARNING: {SQLITE_PATH} not found, skipping.")
        return

    sqlite_conn = sqlite3.connect(SQLITE_PATH)

    rows = sqlite_conn.execute(
        "SELECT topic_id, name, arabic_name, parent_id, ayahs FROM topics"
    ).fetchall()
    sqlite_conn.close()

    topic_rows = []
    verse_topic_rows = []

    for topic_id, name, arabic_name, parent_id, ayahs_str in rows:
        topic_rows.append((topic_id, name or f"topic_{topic_id}", arabic_name, parent_id))

        if ayahs_str:
            for vk in ayahs_str.split(","):
                vk = vk.strip()
                if vk:
                    verse_topic_rows.append((vk, topic_id))

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Pass 1: insert topics without parent
            before_t = cur.execute("SELECT COUNT(*) FROM topics").fetchone()[0]
            cur.executemany(
                "INSERT INTO topics (id, name, name_arabic) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                [(r[0], r[1], r[2]) for r in topic_rows],
            )
            # Pass 2: set parent_id (only for rows that have one)
            cur.executemany(
                "UPDATE topics SET parent_id = %s WHERE id = %s",
                [(r[3], r[0]) for r in topic_rows if r[3] is not None],
            )
            after_t = cur.execute("SELECT COUNT(*) FROM topics").fetchone()[0]

            existing_keys = {
                row[0] for row in cur.execute("SELECT verse_key FROM verses").fetchall()
            }
            valid = [r for r in verse_topic_rows if r[0] in existing_keys]

            before_vt = cur.execute("SELECT COUNT(*) FROM verse_topics").fetchone()[0]
            for i in range(0, len(valid), BATCH_SIZE):
                cur.executemany(
                    "INSERT INTO verse_topics (verse_key, topic_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    valid[i : i + BATCH_SIZE],
                )
            after_vt = cur.execute("SELECT COUNT(*) FROM verse_topics").fetchone()[0]

        conn.commit()

    print(
        f"[05] Loaded {after_t - before_t} topics, "
        f"{after_vt - before_vt} verse-topic mappings"
    )


if __name__ == "__main__":
    main()
