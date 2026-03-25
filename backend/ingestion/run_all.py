"""Master ingestion orchestrator. Run with: python ingestion/run_all.py"""
import subprocess
import sys
from pathlib import Path

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


def main():
    for script in SCRIPTS:
        print(f"\n{'='*60}")
        print(f"Running {script}")
        print("=" * 60)
        result = subprocess.run([sys.executable, script], check=False)
        if result.returncode != 0:
            print(f"ERROR: {script} failed with exit code {result.returncode}")
            sys.exit(result.returncode)
        print(f"OK: {script} completed")

    print("\nAll ingestion scripts completed successfully.")


if __name__ == "__main__":
    main()
