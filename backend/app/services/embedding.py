from openai import AsyncOpenAI

from app.config import settings

MODEL = "text-embedding-3-large"
DIMENSIONS = 3072

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def get_embedding(text: str) -> list[float]:
    response = await _get_client().embeddings.create(
        input=[text],
        model=MODEL,
        dimensions=DIMENSIONS,
    )
    return response.data[0].embedding
