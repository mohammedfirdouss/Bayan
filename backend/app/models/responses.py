from typing import Literal

from pydantic import BaseModel


# Search

class TranslationResult(BaseModel):
    text: str
    translator: str


class TafsirResult(BaseModel):
    tafsir_slug: str
    text_plain: str
    text_html: str


class SearchScores(BaseModel):
    semantic: float
    keyword: float
    hybrid: float


class VerseResult(BaseModel):
    verse_key: str
    surah_number: int
    ayah_number: int
    surah_name: str
    surah_name_arabic: str
    juz: int | None
    text_arabic: str
    translation: TranslationResult | None
    tafsir: TafsirResult | None
    topics: list[str]
    similar_verses: list[str]
    scores: SearchScores


class SearchResponse(BaseModel):
    query: str
    results: list[VerseResult]
    total: int
    search_time_ms: int


# Verify

class VerifyMatch(BaseModel):
    verse_key: str
    surah_name: str
    text_arabic: str
    translation: str
    match_type: Literal["exact", "paraphrase"]
    similarity_score: float


class VerifyResponse(BaseModel):
    input_text: str
    verification_status: Literal["verified_exact", "verified_paraphrase", "not_found"]
    confidence: float
    matches: list[VerifyMatch]
    claude_analysis: str
    warning: str | None = None


# Outline

class OutlineVerse(BaseModel):
    verse_key: str
    text_arabic: str
    translation: str
    tafsir_note: str | None
    rationale: str


class OutlineSection(BaseModel):
    title: str
    talking_points: list[str]
    supporting_verses: list[OutlineVerse]


class KhutbahOutline(BaseModel):
    title: str
    opening_verse: OutlineVerse
    sections: list[OutlineSection]
    closing_dua_verse: OutlineVerse


class OutlineResponse(BaseModel):
    topic: str
    outline: KhutbahOutline
    verses_cited: list[str]
    claude_model: str
    corpus_retrieval_count: int
    warning: str | None = None
