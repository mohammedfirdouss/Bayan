import json
import logging

from app.services.claude import ClaudeResult, run_claude
from app.services.gemini import run_gemini
from app.models.responses import (
    KhutbahOutline,
    OutlineResponse,
    OutlineSection,
    OutlineVerse,
)
from app.services.claude import MODEL

logger = logging.getLogger(__name__)

OUTLINE_TASK_PROMPT = """Generate a structured Khutbah (Friday sermon) outline on the given topic.

Steps:
1. Use search_corpus multiple times — once for the opening, once per main section, once for the closing.
2. After all searches, return ONLY a valid JSON object — no other text before or after.

Required JSON structure:
{{
  "title": "<sermon title>",
  "opening_verse": {{
    "verse_key": "<X:Y>",
    "text_arabic": "<exact Arabic from tool>",
    "translation": "<exact translation from tool>",
    "tafsir_note": "<1-2 sentence note or null>",
    "rationale": "<why this verse opens the sermon>"
  }},
  "sections": [
    {{
      "title": "<section title>",
      "talking_points": ["<point 1>", "<point 2>", "<point 3>"],
      "supporting_verses": [
        {{
          "verse_key": "<X:Y>",
          "text_arabic": "<exact Arabic from tool>",
          "translation": "<exact translation from tool>",
          "tafsir_note": "<brief note or null>",
          "rationale": "<why this verse supports this section>"
        }}
      ]
    }}
  ],
  "closing_dua_verse": {{
    "verse_key": "<X:Y>",
    "text_arabic": "<exact Arabic from tool>",
    "translation": "<exact translation from tool>",
    "tafsir_note": null,
    "rationale": "<why this verse closes the sermon>"
  }}
}}

CRITICAL: Use exact Arabic text and translations returned by tools. Never cite from memory.
Include 2-3 main sections. Each section must have at least one supporting verse."""


def _parse_outline_verse(data: dict) -> OutlineVerse:
    return OutlineVerse(
        verse_key=data.get("verse_key", ""),
        text_arabic=data.get("text_arabic", ""),
        translation=data.get("translation", ""),
        tafsir_note=data.get("tafsir_note"),
        rationale=data.get("rationale", ""),
    )


def _parse_outline(data: dict) -> KhutbahOutline:
    sections = [
        OutlineSection(
            title=s.get("title", ""),
            talking_points=s.get("talking_points", []),
            supporting_verses=[_parse_outline_verse(v) for v in s.get("supporting_verses", [])],
        )
        for s in data.get("sections", [])
    ]
    return KhutbahOutline(
        title=data.get("title", "Khutbah Outline"),
        opening_verse=_parse_outline_verse(data.get("opening_verse", {})),
        sections=sections,
        closing_dua_verse=_parse_outline_verse(data.get("closing_dua_verse", {})),
    )


def _collect_verse_keys(outline: KhutbahOutline) -> list[str]:
    keys = [outline.opening_verse.verse_key, outline.closing_dua_verse.verse_key]
    for section in outline.sections:
        for v in section.supporting_verses:
            keys.append(v.verse_key)
    return [k for k in keys if k]


async def generate_outline(
    topic: str,
    khutbah_style: str,
    target_duration_minutes: int,
    include_tafsir_depth: str = "brief",
    provider: str = "claude",
) -> OutlineResponse:
    style_note = "Eid sermon" if khutbah_style == "eid" else "Friday Jumu'ah sermon"
    tafsir_instruction = {
        "none": "Do not include tafsir notes (set tafsir_note to null for all verses).",
        "brief": "Include brief tafsir notes (1-2 sentences) where relevant.",
        "full": "Include detailed tafsir notes (3-5 sentences) for each verse.",
    }[include_tafsir_depth]
    user_message = (
        f"Topic: {topic}\n"
        f"Style: {style_note}\n"
        f"Target duration: {target_duration_minutes} minutes\n"
        f"Tafsir depth: {tafsir_instruction}"
    )

    run_llm = run_gemini if provider == "gemini" else run_claude
    try:
        result: ClaudeResult = await run_llm(
            user_message=user_message,
            task_prompt=OUTLINE_TASK_PROMPT,
        )
    except Exception as e:
        logger.warning("LLM outline generation unavailable: %s", e)
        fallback_outline = KhutbahOutline(
            title=f"Khutbah on: {topic}",
            opening_verse=OutlineVerse(
                verse_key="", text_arabic="", translation="",
                tafsir_note=None, rationale="",
            ),
            sections=[],
            closing_dua_verse=OutlineVerse(
                verse_key="", text_arabic="", translation="",
                tafsir_note=None, rationale="",
            ),
        )
        return OutlineResponse(
            topic=topic,
            outline=fallback_outline,
            verses_cited=[],
            claude_model=MODEL,
            corpus_retrieval_count=0,
            warning="LLM unavailable: check provider API credits or billing status.",
        )

    # Parse Claude's JSON outline
    outline: KhutbahOutline | None = None
    warning = result.warning

    try:
        # Strip markdown code fences if present
        text = result.text.strip()
        if text.startswith("```"):
            text = text.split("```", 2)[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.rsplit("```", 1)[0].strip()

        parsed = json.loads(text)
        outline = _parse_outline(parsed)
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.warning("Could not parse Claude outline response as JSON: %s", exc)
        # Return a minimal fallback outline
        outline = KhutbahOutline(
            title=f"Khutbah on: {topic}",
            opening_verse=OutlineVerse(
                verse_key="", text_arabic="", translation="",
                tafsir_note=None, rationale="",
            ),
            sections=[],
            closing_dua_verse=OutlineVerse(
                verse_key="", text_arabic="", translation="",
                tafsir_note=None, rationale="",
            ),
        )
        warning = (warning or "") + " | Could not parse structured outline — raw response returned in title field."
        outline.title = result.text  # Store raw text as fallback

    return OutlineResponse(
        topic=topic,
        outline=outline,
        verses_cited=_collect_verse_keys(outline),
        claude_model=MODEL,
        corpus_retrieval_count=result.tool_calls_made,
        warning=warning or None,
    )
