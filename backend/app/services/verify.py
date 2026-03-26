import json
import logging

from app.db import queries as db
from app.services.claude import ClaudeResult, run_claude
from app.services.embedding import get_embedding
from app.models.responses import VerifyMatch, VerifyResponse

logger = logging.getLogger(__name__)

VERIFY_TASK_PROMPT = """The user has submitted a text for Quranic source verification.

Use search_corpus or get_verse to find whether this text matches a verse in the corpus.
Then respond with ONLY a valid JSON object — no other text before or after:

{{
  "verification_status": "verified_exact" | "verified_paraphrase" | "not_found",
  "confidence": <float 0.0-1.0>,
  "analysis": "<brief scholarly explanation>",
  "matched_verse_key": "<verse_key or null>"
}}

Rules:
- "verified_exact": the submitted text matches the verse very closely (same meaning, minor wording differences acceptable)
- "verified_paraphrase": similar meaning but clearly reworded or summarised
- "not_found": no matching verse found in the corpus
- Never guess. If not found, say not_found."""


async def verify_text(text: str, language: str) -> VerifyResponse:
    # Pre-search: embed and find candidates to give Claude a head start
    query_vector = await get_embedding(text)
    candidate_rows = await db.hybrid_search(
        query_vector=query_vector,
        query_text=text,
        tafsir_slug="ibn-kathir",
        top_k=5,
    )

    candidates_context = ""
    if candidate_rows:
        lines = ["Top candidate verses from initial search (verify these):"]
        for row in candidate_rows:
            lines.append(
                f"  [{row['verse_key']}] {row['surah_name']} — "
                f"{row['translation'] or ''}"
            )
        candidates_context = "\n".join(lines)

    user_message = (
        f"Text to verify ({language}):\n\"{text}\"\n\n{candidates_context}"
    )

    result: ClaudeResult = await run_claude(
        user_message=user_message,
        task_prompt=VERIFY_TASK_PROMPT,
    )

    # Parse Claude's JSON response
    status = "not_found"
    confidence = 0.0
    analysis = result.text
    matched_key: str | None = None

    try:
        parsed = json.loads(result.text.strip())
        status = parsed.get("verification_status", "not_found")
        confidence = float(parsed.get("confidence", 0.0))
        analysis = parsed.get("analysis", result.text)
        matched_key = parsed.get("matched_verse_key")
    except (json.JSONDecodeError, ValueError):
        logger.warning("Could not parse Claude verify response as JSON")
        # Fall back: infer status from text
        lower = result.text.lower()
        if "not found" in lower or "not_found" in lower or "could not verify" in lower:
            status = "not_found"
        elif "paraphrase" in lower:
            status = "verified_paraphrase"
            confidence = 0.75
        elif "exact" in lower or "verified" in lower:
            status = "verified_exact"
            confidence = 0.90

    # Build match objects from retrieved verses
    matches = []
    for row in candidate_rows:
        if matched_key and row["verse_key"] != matched_key:
            continue
        if not matched_key and status == "not_found":
            break
        matches.append(VerifyMatch(
            verse_key=row["verse_key"],
            surah_name=row["surah_name"],
            text_arabic=row["text_arabic"],
            translation=row["translation"] or "",
            match_type="exact" if status == "verified_exact" else "paraphrase",
            similarity_score=round(row["hybrid_score"], 4),
        ))

    return VerifyResponse(
        input_text=text,
        verification_status=status,
        confidence=round(confidence, 3),
        matches=matches,
        claude_analysis=analysis,
        warning=result.warning,
    )
