"""Migrate ayah themes from SQLite ayah-themes.db into PostgreSQL themes and verse_themes."""
import os
import sqlite3
from pathlib import Path

import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))
SQLITE_PATH = QURAN_DATA / "Ayah Theme" / "ayah-themes.db" / "ayah-themes.db"

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
        print(f"[06] WARNING: {SQLITE_PATH} not found, skipping.")
        return

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    schema = inspect_schema(sqlite_conn)
    print(f"  SQLite tables: {list(schema.keys())}")
    for table, cols in schema.items():
        print(f"    {table}: {cols}")

    # Collect all theme names and verse-theme mappings
    theme_names: dict[int, str] = {}
    verse_theme_rows: list[tuple[str, int]] = []

    for table, cols in schema.items():
        theme_col = find_col(cols, "theme", "name", "theme_name", "label")
        theme_id_col = find_col(cols, "theme_id", "id")
        verse_col = find_col(cols, "verse_key", "ayah_key", "verse_id", "ayah_id")

        if not (theme_col and verse_col):
            continue

        rows = sqlite_conn.execute(
            f"SELECT {verse_col}, {theme_col}"
            + (f", {theme_id_col}" if theme_id_col and theme_id_col != theme_col else "")
            + f" FROM {table}"
        ).fetchall()

        for row in rows:
            verse_ref = row[0]
            theme_name = str(row[1]) if row[1] else None
            theme_id = row[2] if len(row) > 2 else None

            if not theme_name:
                continue

            # Assign a stable integer ID for each unique theme name
            if theme_name not in theme_names.values():
                tid = theme_id if isinstance(theme_id, int) else len(theme_names) + 1
                theme_names[tid] = theme_name

            tid = next(k for k, v in theme_names.items() if v == theme_name)
            verse_theme_rows.append((str(verse_ref), tid))

    sqlite_conn.close()

    if not theme_names:
        print("[06] No theme data found, skipping.")
        return

    # Build id→verse_key lookup if needed
    sample_verse_refs = [r[0] for r in verse_theme_rows[:10]]
    needs_id_lookup = all(r.isdigit() for r in sample_verse_refs if r)

    id_to_key: dict[int, str] = {}
    if needs_id_lookup:
        with psycopg.connect(DATABASE_URL) as pg_conn:
            id_to_key = {
                row[0]: row[1]
                for row in pg_conn.execute("SELECT id, verse_key FROM verses").fetchall()
            }
        verse_theme_rows = [
            (id_to_key.get(int(vr), vr), tid)
            for vr, tid in verse_theme_rows
        ]

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            before_th = cur.execute("SELECT COUNT(*) FROM themes").fetchone()[0]
            cur.executemany(
                "INSERT INTO themes (id, name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                list(theme_names.items()),
            )
            after_th = cur.execute("SELECT COUNT(*) FROM themes").fetchone()[0]

            existing_keys = {
                row[0] for row in cur.execute("SELECT verse_key FROM verses").fetchall()
            }
            valid = [r for r in verse_theme_rows if r[0] in existing_keys]

            before_vth = cur.execute("SELECT COUNT(*) FROM verse_themes").fetchone()[0]
            for i in range(0, len(valid), BATCH_SIZE):
                cur.executemany(
                    "INSERT INTO verse_themes (verse_key, theme_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    valid[i : i + BATCH_SIZE],
                )
            after_vth = cur.execute("SELECT COUNT(*) FROM verse_themes").fetchone()[0]

        conn.commit()

    print(
        f"[06] Loaded {after_th - before_th} themes, "
        f"{after_vth - before_vth} verse-theme mappings"
    )


if __name__ == "__main__":
    main()
