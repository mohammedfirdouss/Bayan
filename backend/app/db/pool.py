import asyncpg
from pgvector.asyncpg import register_vector

pool: asyncpg.Pool | None = None


async def init_pool(dsn: str) -> None:
    global pool
    pool = await asyncpg.create_pool(dsn, init=register_vector)


async def close_pool() -> None:
    if pool:
        await pool.close()


def get_pool() -> asyncpg.Pool:
    if pool is None:
        raise RuntimeError("Database pool not initialised")
    return pool
