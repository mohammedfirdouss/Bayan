"""Update surahs table with HTML info from surah-info-en.json."""
import json
import os
import re
from pathlib import Path

import bleach
import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))


def strip_html(html: str) -> str:
    plain = bleach.clean(html, tags=[], strip=True)
    return re.sub(r"\s+", " ", plain).strip()


def resolve(path: Path) -> Path:
    if path.is_dir():
        return path / path.name
    return path


def main() -> None:
    path = resolve(QURAN_DATA / "Surah Info" / "surah-info-en.json")
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)

    entries = raw if isinstance(raw, list) else list(raw.values())

    rows = [
        (
            e.get("text", ""),
            strip_html(e.get("text", "")),
            e["surah_number"],
        )
        for e in entries
        if e.get("text")
    ]

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.executemany(
                """
                UPDATE surahs
                SET info_html = %s, info_text = %s
                WHERE id = %s
                """,
                rows,
            )
            updated = cur.rowcount
        conn.commit()

    print(f"[09] Updated {updated} surah info entries")


if __name__ == "__main__":
    main()
