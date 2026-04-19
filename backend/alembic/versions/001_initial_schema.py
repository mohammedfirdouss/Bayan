"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SURAHS
    op.execute("""
        CREATE TABLE surahs (
            id                SMALLINT PRIMARY KEY,
            name_simple       TEXT NOT NULL,
            name_arabic       TEXT NOT NULL,
            revelation_place  TEXT NOT NULL,
            revelation_order  SMALLINT NOT NULL,
            verses_count      SMALLINT NOT NULL,
            bismillah_pre     BOOLEAN NOT NULL DEFAULT TRUE,
            info_html         TEXT,
            info_text         TEXT,
            created_at        TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    # VERSES
    op.execute("""
        CREATE TABLE verses (
            id                INTEGER PRIMARY KEY,
            verse_key         TEXT NOT NULL UNIQUE,
            surah_number      SMALLINT NOT NULL REFERENCES surahs(id),
            ayah_number       SMALLINT NOT NULL,
            words_count       SMALLINT NOT NULL,
            text_arabic       TEXT NOT NULL,
            text_arabic_clean TEXT,
            juz               SMALLINT,
            hizb              SMALLINT,
            rub               SMALLINT,
            manzil            SMALLINT,
            ruku              SMALLINT,
            is_sajda          BOOLEAN DEFAULT FALSE,
            created_at        TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (surah_number, ayah_number)
        )
    """)

    op.execute("""
        CREATE INDEX idx_verses_arabic_fts
            ON verses USING GIN (to_tsvector('arabic', COALESCE(text_arabic_clean, '')))
    """)

    # TRANSLATIONS
    op.execute("""
        CREATE TABLE translations (
            id              SERIAL PRIMARY KEY,
            verse_key       TEXT NOT NULL REFERENCES verses(verse_key),
            language        TEXT NOT NULL,
            translator_slug TEXT NOT NULL,
            text            TEXT NOT NULL,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (verse_key, translator_slug)
        )
    """)

    op.execute("""
        CREATE INDEX idx_translations_en_fts
            ON translations USING GIN (to_tsvector('english', text))
            WHERE language = 'en'
    """)

    # TAFSIRS
    op.execute("""
        CREATE TABLE tafsirs (
            id          SERIAL PRIMARY KEY,
            verse_key   TEXT NOT NULL REFERENCES verses(verse_key),
            tafsir_slug TEXT NOT NULL,
            language    TEXT NOT NULL,
            text_html   TEXT NOT NULL,
            text_plain  TEXT NOT NULL,
            created_at  TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (verse_key, tafsir_slug)
        )
    """)

    op.execute("""
        CREATE INDEX idx_tafsirs_en_fts
            ON tafsirs USING GIN (to_tsvector('english', text_plain))
            WHERE language = 'en'
    """)

    # TOPICS
    op.execute("""
        CREATE TABLE topics (
            id           SERIAL PRIMARY KEY,
            name         TEXT NOT NULL UNIQUE,
            name_arabic  TEXT,
            parent_id    INTEGER REFERENCES topics(id),
            created_at   TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE verse_topics (
            verse_key  TEXT    NOT NULL REFERENCES verses(verse_key),
            topic_id   INTEGER NOT NULL REFERENCES topics(id),
            PRIMARY KEY (verse_key, topic_id)
        )
    """)

    # THEMES
    op.execute("""
        CREATE TABLE themes (
            id         SERIAL PRIMARY KEY,
            name       TEXT NOT NULL UNIQUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE verse_themes (
            verse_key TEXT    NOT NULL REFERENCES verses(verse_key),
            theme_id  INTEGER NOT NULL REFERENCES themes(id),
            PRIMARY KEY (verse_key, theme_id)
        )
    """)

    # VERSE SIMILARITIES
    op.execute("""
        CREATE TABLE verse_similarities (
            source_key   TEXT     NOT NULL REFERENCES verses(verse_key),
            matched_key  TEXT     NOT NULL REFERENCES verses(verse_key),
            score        SMALLINT NOT NULL,
            coverage     SMALLINT NOT NULL,
            match_words  JSONB,
            PRIMARY KEY (source_key, matched_key)
        )
    """)

    # MUTASHABIHAT
    op.execute("""
        CREATE TABLE mutashabihat_phrases (
            id               INTEGER PRIMARY KEY,
            occurrence_count SMALLINT,
            source_key       TEXT REFERENCES verses(verse_key),
            word_range_start SMALLINT,
            word_range_end   SMALLINT
        )
    """)

    op.execute("""
        CREATE TABLE mutashabihat_occurrences (
            phrase_id   INTEGER NOT NULL REFERENCES mutashabihat_phrases(id),
            verse_key   TEXT    NOT NULL REFERENCES verses(verse_key),
            word_ranges JSONB   NOT NULL,
            PRIMARY KEY (phrase_id, verse_key)
        )
    """)

    # EMBEDDINGS (pgvector)
    op.execute("""
        CREATE TABLE verse_embeddings (
            verse_key      TEXT     NOT NULL REFERENCES verses(verse_key),
            embedding_type TEXT     NOT NULL,
            model          TEXT     NOT NULL,
            dimensions     SMALLINT NOT NULL,
            embedding      vector(3072),
            created_at     TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (verse_key, embedding_type, model)
        )
    """)

    # pgvector ANN indexes for `vector` are limited to 2,000 dimensions.
    # We use 3,072-dim embeddings, so keep exact search and index filter columns.
    op.execute("""
        CREATE INDEX idx_verse_embeddings_lookup
            ON verse_embeddings (embedding_type, model)
    """)

    op.execute("""
        CREATE TABLE tafsir_embeddings (
            verse_key   TEXT     NOT NULL REFERENCES verses(verse_key),
            tafsir_slug TEXT     NOT NULL,
            chunk_index SMALLINT NOT NULL DEFAULT 0,
            embedding   vector(3072),
            created_at  TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (verse_key, tafsir_slug, chunk_index)
        )
    """)

    op.execute("""
        CREATE INDEX idx_tafsir_embeddings_lookup
            ON tafsir_embeddings (tafsir_slug, verse_key)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_tafsir_embeddings_lookup")
    op.execute("DROP INDEX IF EXISTS idx_tafsir_embeddings_hnsw")
    op.execute("DROP TABLE IF EXISTS tafsir_embeddings")
    op.execute("DROP INDEX IF EXISTS idx_verse_embeddings_lookup")
    op.execute("DROP INDEX IF EXISTS idx_verse_embeddings_hnsw")
    op.execute("DROP TABLE IF EXISTS verse_embeddings")
    op.execute("DROP TABLE IF EXISTS mutashabihat_occurrences")
    op.execute("DROP TABLE IF EXISTS mutashabihat_phrases")
    op.execute("DROP TABLE IF EXISTS verse_similarities")
    op.execute("DROP TABLE IF EXISTS verse_themes")
    op.execute("DROP TABLE IF EXISTS themes")
    op.execute("DROP TABLE IF EXISTS verse_topics")
    op.execute("DROP TABLE IF EXISTS topics")
    op.execute("DROP INDEX IF EXISTS idx_tafsirs_en_fts")
    op.execute("DROP TABLE IF EXISTS tafsirs")
    op.execute("DROP INDEX IF EXISTS idx_translations_en_fts")
    op.execute("DROP TABLE IF EXISTS translations")
    op.execute("DROP INDEX IF EXISTS idx_verses_arabic_fts")
    op.execute("DROP TABLE IF EXISTS verses")
    op.execute("DROP TABLE IF EXISTS surahs")
