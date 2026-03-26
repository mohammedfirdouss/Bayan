import time

from app.db import queries as db
from app.models.requests import SearchFilters
from app.models.responses import SearchResponse, SearchScores, TafsirResult, TranslationResult, VerseResult
from app.services.embedding import get_embedding


async def hybrid_search(
    query: str,
    top_k: int,
    filters: SearchFilters,
    tafsir_slug: str | None,
) -> SearchResponse:
    start = time.monotonic()

    query_vector = await get_embedding(query)

    rows = await db.hybrid_search(
        query_vector=query_vector,
        query_text=query,
        tafsir_slug=tafsir_slug or "ibn-kathir",
        top_k=top_k,
        topic=filters.topic,
        revelation_place=filters.revelation_place,
        juz=filters.juz,
    )

    results = []
    for row in rows:
        similar = await db.get_similar_verses(row["verse_key"], limit=3)

        translation = (
            TranslationResult(text=row["translation"], translator="Sahih International")
            if row["translation"]
            else None
        )

        tafsir = (
            TafsirResult(
                tafsir_slug=tafsir_slug or "ibn-kathir",
                text_plain=row["tafsir_plain"] or "",
                text_html=row["tafsir_html"] or "",
            )
            if tafsir_slug and row["tafsir_plain"]
            else None
        )

        results.append(VerseResult(
            verse_key=row["verse_key"],
            surah_number=row["surah_number"],
            ayah_number=row["ayah_number"],
            surah_name=row["surah_name"],
            surah_name_arabic=row["surah_name_arabic"],
            juz=row["juz"],
            text_arabic=row["text_arabic"],
            translation=translation,
            tafsir=tafsir,
            topics=row["topics"] or [],
            similar_verses=similar,
            scores=SearchScores(
                semantic=round(row["semantic_score"], 4),
                keyword=round(row["keyword_score"], 4),
                hybrid=round(row["hybrid_score"], 4),
            ),
        ))

    return SearchResponse(
        query=query,
        results=results,
        total=len(results),
        search_time_ms=int((time.monotonic() - start) * 1000),
    )
