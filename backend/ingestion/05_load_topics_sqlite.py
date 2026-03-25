"""Migrate topics from SQLite topics.db into PostgreSQL topics and verse_topics tables."""
import json
import os
import sqlite3
from pathlib import Path

import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))
SQLITE_PATH = QURAN_DATA / "Topics and Concepts in Quran" / "topics.db" / "topics.db"

BATCH_SIZE = 500


def inspect_schema(conn: sqlite3.Connection) -> dict[str, list[str]]:
    tables = [
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    ]
    return {
        t: [col[1] for col in conn.execute(f"PRAGMA table_info({t})").fetchall()]
        for t in tables
    }


def find_col(columns: list[str], *candidates: str) -> str | None:
    for c in candidates:
        if c in columns:
            return c
    return None


def main() -> None:
    if not SQLITE_PATH.exists():
        print(f"[05] WARNING: {SQLITE_PATH} not found, skipping.")
        return

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    schema = inspect_schema(sqlite_conn)
    print(f"  SQLite tables: {list(schema.keys())}")
    for table, cols in schema.items():
        print(f"    {table}: {cols}")

    # Discover topics table
    topic_table = next(
        (t for t in schema if "topic" in t.lower()), None
    )
    if not topic_table:
        print("[05] No topics table found, skipping.")
        sqlite_conn.close()
        return

    topic_cols = schema[topic_table]
    id_col = find_col(topic_cols, "id")
    name_col = find_col(topic_cols, "name", "name_en", "title", "label")
    name_ar_col = find_col(topic_cols, "name_ar", "name_arabic", "arabic")
    parent_col = find_col(topic_cols, "parent_id", "parent")

    if not id_col or not name_col:
        print(f"[05] Cannot determine topic id/name columns in {topic_table}, skipping.")
        sqlite_conn.close()
        return

    topic_rows_sqlite = sqlite_conn.execute(
        f"SELECT {id_col}, {name_col}"
        + (f", {name_ar_col}" if name_ar_col else "")
        + (f", {parent_col}" if parent_col else "")
        + f" FROM {topic_table}"
    ).fetchall()

    # Build topic insert rows
    topic_rows = []
    for row in topic_rows_sqlite:
        idx = 0
        tid = row[idx]; idx += 1
        name = row[idx]; idx += 1
        name_ar = row[idx] if name_ar_col else None; idx += (1 if name_ar_col else 0)
        parent = row[idx] if parent_col else None
        topic_rows.append((tid, name or f"topic_{tid}", name_ar, parent))

    # Discover verse-topic mapping table
    mapping_table = next(
        (t for t in schema if "verse" in t.lower() or "ayah" in t.lower()), None
    )
    if not mapping_table:
        # Try to find any table with topic_id and verse columns
        mapping_table = next(
            (t for t in schema if t != topic_table), None
        )

    verse_topic_rows = []
    if mapping_table:
        map_cols = schema[mapping_table]
        print(f"  Mapping table: {mapping_table} — columns: {map_cols}")

        topic_id_col = find_col(map_cols, "topic_id", "tag_id")
        verse_col = find_col(map_cols, "verse_key", "ayah_key", "verse_id", "ayah_id", "id")

        if topic_id_col and verse_col:
            mapping_rows = sqlite_conn.execute(
                f"SELECT {verse_col}, {topic_id_col} FROM {mapping_table}"
            ).fetchall()

            # Normalise verse references: integer IDs need converting to verse_key
            # Build id→verse_key lookup from PostgreSQL if needed
            needs_id_lookup = all(
                isinstance(r[0], int) for r in mapping_rows[:10] if r[0] is not None
            )

            id_to_key: dict[int, str] = {}
            if needs_id_lookup:
                with psycopg.connect(DATABASE_URL) as pg_conn:
                    id_to_key = {
                        row[0]: row[1]
                        for row in pg_conn.execute("SELECT id, verse_key FROM verses").fetchall()
                    }

            for verse_ref, topic_id in mapping_rows:
                verse_key = id_to_key.get(verse_ref, str(verse_ref)) if needs_id_lookup else str(verse_ref)
                verse_topic_rows.append((verse_key, topic_id))

    sqlite_conn.close()

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Insert topics (two-pass to handle self-referential parent_id)
            # Pass 1: insert all without parent
            before_t = cur.execute("SELECT COUNT(*) FROM topics").fetchone()[0]
            cur.executemany(
                "INSERT INTO topics (id, name, name_arabic) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                [(r[0], r[1], r[2]) for r in topic_rows],
            )
            # Pass 2: update parent_id
            cur.executemany(
                "UPDATE topics SET parent_id = %s WHERE id = %s AND %s IS NOT NULL",
                [(r[3], r[0], r[3]) for r in topic_rows],
            )
            after_t = cur.execute("SELECT COUNT(*) FROM topics").fetchone()[0]

            # Insert verse-topic mappings (only for verse_keys that exist)
            existing_keys = {
                row[0] for row in cur.execute("SELECT verse_key FROM verses").fetchall()
            }
            valid_mappings = [r for r in verse_topic_rows if r[0] in existing_keys]

            before_vt = cur.execute("SELECT COUNT(*) FROM verse_topics").fetchone()[0]
            for i in range(0, len(valid_mappings), BATCH_SIZE):
                cur.executemany(
                    "INSERT INTO verse_topics (verse_key, topic_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    valid_mappings[i : i + BATCH_SIZE],
                )
            after_vt = cur.execute("SELECT COUNT(*) FROM verse_topics").fetchone()[0]

        conn.commit()

    print(
        f"[05] Loaded {after_t - before_t} topics, "
        f"{after_vt - before_vt} verse-topic mappings"
    )


if __name__ == "__main__":
    main()
