from fastapi import APIRouter, Request

from app.limiter import limiter
from app.models.requests import OutlineRequest
from app.models.responses import OutlineResponse
from app.services import outline as outline_service

router = APIRouter()


@router.post("", response_model=OutlineResponse)
@limiter.limit("60/minute")
async def outline(request: Request, body: OutlineRequest) -> OutlineResponse:
    return await outline_service.generate_outline(
        topic=body.topic,
        khutbah_style=body.khutbah_style,
        target_duration_minutes=body.target_duration_minutes,
        include_tafsir_depth=body.include_tafsir_depth,
    )
