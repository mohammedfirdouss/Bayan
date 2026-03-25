"""Master ingestion orchestrator.

Run with:
    docker compose --profile ingestion up ingestion

Or individually:
    docker compose run --rm ingestion python ingestion/02_load_verses.py
"""
import subprocess
import sys

SCRIPTS = [
    "ingestion/01_load_surahs.py",
    "ingestion/02_load_verses.py",
    "ingestion/03_fetch_translations.py",
    "ingestion/04_load_tafsirs.py",
    "ingestion/05_load_topics_sqlite.py",
    "ingestion/06_load_themes_sqlite.py",
    "ingestion/07_load_similar_ayah.py",
    "ingestion/08_load_mutashabihat.py",
    "ingestion/09_load_surah_info.py",
    "ingestion/10_generate_embeddings.py",
]


def main() -> None:
    for script in SCRIPTS:
        print(f"\n{'=' * 60}")
        print(f"  {script}")
        print("=" * 60)
        result = subprocess.run([sys.executable, script], check=False)
        if result.returncode != 0:
            print(f"\nERROR: {script} failed (exit {result.returncode})")
            sys.exit(result.returncode)

    print("\nAll ingestion scripts completed successfully.")


if __name__ == "__main__":
    main()
