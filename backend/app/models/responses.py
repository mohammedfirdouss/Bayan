from pydantic import BaseModel


class TranslationResult(BaseModel):
    text: str
    translator: str


class TafsirResult(BaseModel):
    tafsir_slug: str
    text_plain: str
    text_html: str


class SearchScores(BaseModel):
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
