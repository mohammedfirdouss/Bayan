import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Read DATABASE_URL from environment, falling back to alembic.ini
database_url = os.environ.get("DATABASE_URL") or config.get_main_option("sqlalchemy.url")

# asyncpg URLs need to use the sync psycopg driver for Alembic
if database_url and database_url.startswith("postgresql://"):
    sync_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    sync_url = database_url


def run_migrations_offline() -> None:
    context.configure(
        url=sync_url,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(sync_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
