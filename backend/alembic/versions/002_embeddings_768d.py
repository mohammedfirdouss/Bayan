"""Switch embedding columns from vector(3072) to vector(768) and add HNSW indexes.

Revision ID: 002
Revises: 001
Create Date: 2026-04-26
"""
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop existing data (no embeddings generated yet) and retype columns
    op.execute("TRUNCATE verse_embeddings")
    op.execute("TRUNCATE tafsir_embeddings")

    op.execute("ALTER TABLE verse_embeddings ALTER COLUMN embedding TYPE vector(768)")
    op.execute("ALTER TABLE tafsir_embeddings ALTER COLUMN embedding TYPE vector(768)")

    # HNSW indexes are now possible (limit is 2000 dims)
    op.execute("""
        CREATE INDEX idx_verse_embeddings_hnsw
            ON verse_embeddings
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
        WHERE embedding_type = 'composite'
    """)
    op.execute("""
        CREATE INDEX idx_tafsir_embeddings_hnsw
            ON tafsir_embeddings
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_verse_embeddings_hnsw")
    op.execute("DROP INDEX IF EXISTS idx_tafsir_embeddings_hnsw")
    op.execute("TRUNCATE verse_embeddings")
    op.execute("TRUNCATE tafsir_embeddings")
    op.execute("ALTER TABLE verse_embeddings ALTER COLUMN embedding TYPE vector(3072)")
    op.execute("ALTER TABLE tafsir_embeddings ALTER COLUMN embedding TYPE vector(3072)")
