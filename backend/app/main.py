import uuid
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db.pool import close_pool, init_pool
from app.limiter import limiter
from app.api.search import router as search_router
from app.api.verify import router as verify_router
from app.api.outline import router as outline_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool(settings.database_url)
    yield
    await close_pool()


app = FastAPI(title="Bayan API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(asyncpg.PostgresConnectionError)
async def db_unavailable_handler(request: Request, exc: asyncpg.PostgresConnectionError):
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})

app.include_router(search_router,  prefix="/search",  tags=["search"])
app.include_router(verify_router,  prefix="/verify",  tags=["verify"])
app.include_router(outline_router, prefix="/outline", tags=["outline"])


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/health")
async def health():
    from app.db.pool import get_pool
    async with get_pool().acquire() as conn:
        await conn.fetchval("SELECT 1")
    return {"status": "ok"}
