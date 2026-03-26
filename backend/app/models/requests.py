from typing import Literal

from pydantic import BaseModel, Field


class SearchFilters(BaseModel):
    topic: str | None = None
    revelation_place: Literal["makkah", "madinah"] | None = None
    juz: int | None = Field(None, ge=1, le=30)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(10, ge=1, le=20)
    filters: SearchFilters = Field(default_factory=SearchFilters)
    include_tafsir: bool = True
    tafsir_slug: str = "ibn-kathir"


class VerifyRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=2000)
    language: Literal["ar", "en"] = "ar"


class OutlineRequest(BaseModel):
    topic: str = Field(..., min_length=5, max_length=300)
    language: Literal["en"] = "en"
    khutbah_style: Literal["friday", "eid"] = "friday"
    target_duration_minutes: int = Field(20, ge=10, le=45)
    include_tafsir_depth: Literal["none", "brief", "full"] = "brief"
