"""Migrate ayah themes from SQLite ayah-themes.db into PostgreSQL themes and verse_themes."""
import os
import sqlite3
from pathlib import Path

import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))
SQLITE_PATH = QURAN_DATA / "Ayah Theme" / "ayah-themes.db" / "ayah-themes.db"

BATCH_SIZE = 500


def main() -> None:
    if not SQLITE_PATH.exists():
        print(f"[06] WARNING: {SQLITE_PATH} not found, skipping.")
        return

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    rows = sqlite_conn.execute(
        "SELECT theme, surah_number, ayah_from, ayah_to FROM themes"
    ).fetchall()
    sqlite_conn.close()

    # Build unique theme name → id mapping
    theme_names: dict[str, int] = {}
    verse_theme_rows: list[tuple[str, int]] = []

    for theme_name, surah, ayah_from, ayah_to in rows:
        if not theme_name:
            continue
        if theme_name not in theme_names:
            theme_names[theme_name] = len(theme_names) + 1
        tid = theme_names[theme_name]

        for ayah in range(ayah_from, ayah_to + 1):
            verse_theme_rows.append((f"{surah}:{ayah}", tid))

    if not theme_names:
        print("[06] No theme data found, skipping.")
        return

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            before_th = cur.execute("SELECT COUNT(*) FROM themes").fetchone()[0]
            cur.executemany(
                "INSERT INTO themes (id, name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                [(tid, name) for name, tid in theme_names.items()],
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
