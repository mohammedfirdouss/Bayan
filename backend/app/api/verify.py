from fastapi import APIRouter, Request

from app.limiter import limiter
from app.models.requests import VerifyRequest
from app.models.responses import VerifyResponse
from app.services import verify as verify_service

router = APIRouter()


@router.post("", response_model=VerifyResponse)
@limiter.limit("60/minute")
async def verify(request: Request, body: VerifyRequest) -> VerifyResponse:
    return await verify_service.verify_text(
        text=body.text,
        language=body.language,
        provider=body.provider,
    )
