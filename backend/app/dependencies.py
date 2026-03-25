from typing import AsyncGenerator

import asyncpg

from app.db.pool import get_pool


async def get_conn() -> AsyncGenerator[asyncpg.Connection, None]:
    async with get_pool().acquire() as conn:
        yield conn
