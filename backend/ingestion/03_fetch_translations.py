"""Fetch Sahih International translations from quran.com API v4."""
import argparse
import json
import os
import time
from pathlib import Path

import bleach
import httpx
import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))

API_BASE = "https://api.quran.com/api/v4"
TRANSLATION_ID = 20    # Saheeh International (slug: en-sahih-international)
TRANSLATOR_SLUG = "sahih-international"
REQUEST_DELAY = 0.5    # seconds between API calls


def strip_footnotes(text: str) -> str:
    return bleach.clean(text, tags=[], strip=True).strip()


def fetch_surah(client: httpx.Client, surah_id: int) -> list[tuple]:
    url = f"{API_BASE}/verses/by_chapter/{surah_id}"
    params = {
        "translations": TRANSLATION_ID,
        "fields": "verse_key",
        "per_page": 300,
        "page": 1,
    }
    response = client.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    rows = []
    for verse in data["verses"]:
        verse_key = verse["verse_key"]
        for t in verse.get("translations", []):
            rows.append((
                verse_key,
                "en",
                TRANSLATOR_SLUG,
                strip_footnotes(t["text"]),
            ))
    return rows


def load_from_cache(cache_path: Path) -> list[tuple]:
    with open(cache_path, encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    surahs = data if isinstance(data, list) else list(data.values())
    for surah in surahs:
        for verse in surah.get("verses", []):
            verse_key = verse["verse_key"]
            for t in verse.get("translations", []):
                rows.append((
                    verse_key,
                    "en",
                    TRANSLATOR_SLUG,
                    strip_footnotes(t["text"]),
                ))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--local-cache",
        type=Path,
        help="Path to a locally cached JSON dump (skips API calls)",
    )
    args = parser.parse_args()

    if args.local_cache:
        print(f"[03] Loading translations from cache: {args.local_cache}")
        all_rows = load_from_cache(args.local_cache)
    else:
        all_rows = []
        with httpx.Client() as client:
            for surah_id in range(1, 115):
                print(f"  Fetching surah {surah_id}/114...", end="\r")
                rows = fetch_surah(client, surah_id)
                all_rows.extend(rows)
                time.sleep(REQUEST_DELAY)
        print()

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            before = cur.execute("SELECT COUNT(*) FROM translations").fetchone()[0]
            cur.executemany(
                """
                INSERT INTO translations (verse_key, language, translator_slug, text)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                all_rows,
            )
            after = cur.execute("SELECT COUNT(*) FROM translations").fetchone()[0]
        conn.commit()

    print(f"[03] Loaded {after - before} translations ({TRANSLATOR_SLUG}), total: {after}")


if __name__ == "__main__":
    main()
