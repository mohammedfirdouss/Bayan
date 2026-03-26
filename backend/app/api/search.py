from fastapi import APIRouter, Request

from app.limiter import limiter
from app.models.requests import SearchRequest
from app.models.responses import SearchResponse
from app.services import search as search_service

router = APIRouter()


@router.post("", response_model=SearchResponse)
@limiter.limit("60/minute")
async def search(request: Request, body: SearchRequest) -> SearchResponse:
    return await search_service.hybrid_search(
        query=body.query,
        top_k=body.top_k,
        filters=body.filters,
        tafsir_slug=body.tafsir_slug if body.include_tafsir else None,
    )
