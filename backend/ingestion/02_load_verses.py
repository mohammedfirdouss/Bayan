"""Load 6,236 verses from quran-metadata-ayah.json with structural metadata."""
import json
import os
import re
import unicodedata
from pathlib import Path

import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
QURAN_DATA = Path(os.environ.get("QURAN_DATA_PATH", "/app/quran-data"))
META = QURAN_DATA / "Quran metadata"

BATCH_SIZE = 500


def strip_diacritics(text: str) -> str:
    """Remove Arabic diacritics (harakat) for full-text search."""
    return "".join(
        c for c in unicodedata.normalize("NFKD", text)
        if unicodedata.category(c) != "Mn"
    )


def build_verse_map(filepath: Path, number_field: str) -> dict[str, int]:
    """Build {verse_key: number} from a structural metadata file (juz/hizb/etc)."""
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    verse_map: dict[str, int] = {}
    for item in data.values():
        number = item.get(number_field)
        for surah_str, ayah_range in item.get("verse_mapping", {}).items():
            surah = int(surah_str)
            ayah_range = str(ayah_range)
            if "-" in ayah_range:
                start, end = map(int, ayah_range.split("-"))
                for ayah in range(start, end + 1):
                    verse_map[f"{surah}:{ayah}"] = number
            else:
                verse_map[f"{surah}:{int(ayah_range)}"] = number
    return verse_map


def build_sajda_set(filepath: Path) -> set[str]:
    """Return set of verse_keys that require sajda."""
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    keys: set[str] = set()
    items = data if isinstance(data, list) else list(data.values())
    for item in items:
        if isinstance(item, dict):
            vk = item.get("verse_key") or item.get("id")
            if vk:
                keys.add(str(vk))
        elif isinstance(item, str):
            keys.add(item)
    return keys


def main() -> None:
    # Load structural metadata
    juz_map = build_verse_map(META / "quran-metadata-juz.json", "juz_number")
    hizb_map = build_verse_map(META / "quran-metadata-hizb.json", "hizb_number")
    rub_map = build_verse_map(META / "quran-metadata-rub.json", "rub_el_hizb_number")
    manzil_map = build_verse_map(META / "quran-metadata-manzil.json", "manzil_number")
    ruku_map = build_verse_map(META / "quran-metadata-ruku.json", "ruku_number")
    sajda_set = build_sajda_set(META / "quran-metadata-sajda.json")

    # Load verses
    with open(META / "quran-metadata-ayah.json", encoding="utf-8") as f:
        raw = json.load(f)

    verses = list(raw.values()) if isinstance(raw, dict) else raw

    rows = []
    for v in verses:
        vk = v["verse_key"]
        rows.append((
            v["id"],
            vk,
            v["surah_number"],
            v["ayah_number"],
            v["words_count"],
            v["text"],
            strip_diacritics(v["text"]),
            juz_map.get(vk),
            hizb_map.get(vk),
            rub_map.get(vk),
            manzil_map.get(vk),
            ruku_map.get(vk),
            vk in sajda_set,
        ))

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            before = cur.execute("SELECT COUNT(*) FROM verses").fetchone()[0]
            for i in range(0, len(rows), BATCH_SIZE):
                cur.executemany(
                    """
                    INSERT INTO verses
                        (id, verse_key, surah_number, ayah_number, words_count,
                         text_arabic, text_arabic_clean,
                         juz, hizb, rub, manzil, ruku, is_sajda)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    rows[i : i + BATCH_SIZE],
                )
            after = cur.execute("SELECT COUNT(*) FROM verses").fetchone()[0]
        conn.commit()

    print(f"[02] Loaded {after - before} verses (total: {after})")


if __name__ == "__main__":
    main()
