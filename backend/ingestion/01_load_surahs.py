"""Load 114 surahs from quran-metadata-surah-name.json into the surahs table."""
import json
import os
import sys
from pathlib import Path

import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))


def resolve(path: Path) -> Path:
    if path.is_dir():
        return path / path.name
    return path


def main() -> None:
    path = resolve(QURAN_DATA / "quran-metadata-surah-name.json")
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)

    # Handles both array [{...}, ...] and object {"1": {...}, ...}
    surahs = raw if isinstance(raw, list) else list(raw.values())

    rows = [
        (
            s["id"],
            s["name_simple"],
            s["name_arabic"],
            s["revelation_place"],
            s["revelation_order"],
            s["verses_count"],
            s["bismillah_pre"],
        )
        for s in surahs
    ]

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            before = cur.execute("SELECT COUNT(*) FROM surahs").fetchone()[0]
            cur.executemany(
                """
                INSERT INTO surahs
                    (id, name_simple, name_arabic, revelation_place,
                     revelation_order, verses_count, bismillah_pre)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                rows,
            )
            after = cur.execute("SELECT COUNT(*) FROM surahs").fetchone()[0]
        conn.commit()

    print(f"[01] Loaded {after - before} surahs (total: {after})")


if __name__ == "__main__":
    main()
