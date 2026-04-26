from google import genai

from app.config import settings

MODEL = "gemini-embedding-001"
DIMENSIONS = 768

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def get_embedding(text: str) -> list[float]:
    response = await _get_client().aio.models.embed_content(
        model=MODEL,
        contents=text,
        config={"output_dimensionality": DIMENSIONS},
    )
    return (response.embeddings or [])[0].values or []
