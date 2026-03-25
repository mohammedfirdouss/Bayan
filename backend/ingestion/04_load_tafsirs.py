"""Load tafsir commentary from all four tafsir JSON files."""
import json
import os
import re
from pathlib import Path

import bleach
import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))
TAFSIRS_DIR = QURAN_DATA / "Tafsirs"

TAFSIR_SOURCES = [
    {
        "path": TAFSIRS_DIR / "en-tafisr-ibn-kathir.json" / "en-tafisr-ibn-kathir.json",
        "slug": "ibn-kathir",
        "language": "en",
    },
    {
        "path": TAFSIRS_DIR / "tafsir-ibn-uthaymeen.json" / "tafsir-ibn-uthaymeen.json",
        "slug": "ibn-uthaymeen",
        "language": "ar",
    },
    {
        "path": TAFSIRS_DIR / "Tafseer Al Saddi.json" / "Tafseer Al Saddi.json",
        "slug": "saadi",
        "language": "ar",
    },
    {
        "path": TAFSIRS_DIR / "sq-saadi.json" / "sq-saadi.json",
        "slug": "saadi-sq",
        "language": "sq",
    },
]

BATCH_SIZE = 200


def strip_html(html: str) -> str:
    plain = bleach.clean(html, tags=[], strip=True)
    return re.sub(r"\s+", " ", plain).strip()


def load_tafsir(source: dict) -> None:
    path: Path = source["path"]
    slug: str = source["slug"]
    language: str = source["language"]

    if not path.exists():
        print(f"  WARNING: {path} not found, skipping.")
        return

    print(f"  Loading {slug} ({language}) from {path.name}...")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for verse_key, item in data.items():
        html = item.get("text", "")
        if not html:
            continue
        rows.append((
            verse_key,
            slug,
            language,
            html,
            strip_html(html),
        ))

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            before = cur.execute(
                "SELECT COUNT(*) FROM tafsirs WHERE tafsir_slug = %s", (slug,)
            ).fetchone()[0]
            for i in range(0, len(rows), BATCH_SIZE):
                cur.executemany(
                    """
                    INSERT INTO tafsirs
                        (verse_key, tafsir_slug, language, text_html, text_plain)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    rows[i : i + BATCH_SIZE],
                )
            after = cur.execute(
                "SELECT COUNT(*) FROM tafsirs WHERE tafsir_slug = %s", (slug,)
            ).fetchone()[0]
        conn.commit()

    print(f"  [{slug}] {after - before} entries inserted (total: {after})")


def main() -> None:
    for source in TAFSIR_SOURCES:
        load_tafsir(source)
    print("[04] Tafsir loading complete")


if __name__ == "__main__":
    main()
