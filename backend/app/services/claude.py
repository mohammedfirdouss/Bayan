import json
import logging
import re
from dataclasses import dataclass, field

from anthropic import AsyncAnthropic

from app.config import settings
from app.db import queries as db
from app.services.embedding import get_embedding

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"
MAX_ITERATIONS = 5

_client: AsyncAnthropic | None = None


def _get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


TOOLS = [
    {
        "name": "search_corpus",
        "description": (
            "Search the Quranic corpus for verses relevant to a topic or concept. "
            "Returns verses with Arabic text, English translation, and tafsir commentary. "
            "You MUST call this tool before citing any verse — never quote a verse from memory."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Semantic search query",
                },
                "top_k": {
                    "type": "integer",
                    "default": 10,
                    "maximum": 20,
                },
                "topic_filter": {
                    "type": "string",
                    "description": "Optional: restrict results to a specific topic name",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_verse",
        "description": "Retrieve a specific verse by key (e.g. '2:155'). Use when you know the exact verse needed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "verse_key": {
                    "type": "string",
                    "pattern": r"^\d+:\d+$",
                },
            },
            "required": ["verse_key"],
        },
    },
    {
        "name": "get_similar_verses",
        "description": "Given a verse key, return linguistically similar verses that share phrases or words.",
        "input_schema": {
            "type": "object",
            "properties": {
                "verse_key": {"type": "string"},
                "limit": {"type": "integer", "default": 5},
            },
            "required": ["verse_key"],
        },
    },
]

BASE_SYSTEM_PROMPT = """You are Bayan, a scholarly assistant for Islamic sermon (Khutbah) research.

CRITICAL RULES:
1. You may ONLY cite Quranic verses that you have retrieved using the search_corpus or get_verse tools.
   Never quote or reference a verse from memory — always retrieve it first.
2. Every verse citation must include the verse key (e.g., [2:155]).
3. Use the provided Arabic text and English translation exactly as returned by the tools —
   do not paraphrase or alter them.
4. If the corpus does not contain relevant material, state this clearly rather than fabricating content.
5. For /verify: if you cannot find the exact text in the corpus, respond that the source
   could not be verified — do not guess.

Your audience is an English-speaking Khateeb preparing a Friday sermon.
Citations should be formatted as: (Surah Name, X:Y)."""


@dataclass
class ClaudeResult:
    text: str
    retrieved_verse_keys: set[str] = field(default_factory=set)
    warning: str | None = None
    tool_calls_made: int = 0


# Tool execution

async def _execute_search_corpus(tool_input: dict) -> dict:
    query = tool_input["query"]
    top_k = min(tool_input.get("top_k", 10), 20)
    topic = tool_input.get("topic_filter")

    try:
        query_vector = await get_embedding(query)
        rows = await db.hybrid_search(
            query_vector=query_vector,
            query_text=query,
            tafsir_slug="ibn-kathir",
            top_k=top_k,
            topic=topic,
        )
    except Exception as e:
        logger.warning("search_corpus unavailable (embeddings not ready): %s", e)
        return {"results": [], "count": 0, "warning": "Corpus search unavailable — embeddings not yet generated."}

    results = []
    for row in rows:
        results.append({
            "verse_key": row["verse_key"],
            "surah_name": row["surah_name"],
            "ayah_number": row["ayah_number"],
            "text_arabic": row["text_arabic"],
            "translation": row["translation"] or "",
            "tafsir_excerpt": (row["tafsir_plain"] or "")[:300],
            "relevance_score": round(row["hybrid_score"], 4),
        })

    return {"results": results, "count": len(results)}


async def _execute_get_verse(tool_input: dict) -> dict:
    verse_key = tool_input["verse_key"]
    row = await db.get_verse(verse_key)

    if not row:
        return {"error": f"Verse {verse_key} not found in corpus."}

    return {
        "verse_key": row["verse_key"],
        "surah_name": row["surah_name"],
        "surah_name_arabic": row["surah_name_arabic"],
        "ayah_number": row["ayah_number"],
        "text_arabic": row["text_arabic"],
        "translation": row["translation"] or "",
        "tafsir_plain": (row["tafsir_plain"] or "")[:500],
    }


async def _execute_get_similar_verses(tool_input: dict) -> dict:
    verse_key = tool_input["verse_key"]
    limit = min(tool_input.get("limit", 5), 10)

    similar_keys = await db.get_similar_verses(verse_key, limit=limit)

    similar = []
    for vk in similar_keys:
        row = await db.get_verse(vk)
        if row:
            similar.append({
                "verse_key": row["verse_key"],
                "surah_name": row["surah_name"],
                "text_arabic": row["text_arabic"],
                "translation": row["translation"] or "",
            })

    return {"verse_key": verse_key, "similar_verses": similar}


async def execute_tool(name: str, tool_input: dict) -> dict:
    if name == "search_corpus":
        return await _execute_search_corpus(tool_input)
    if name == "get_verse":
        return await _execute_get_verse(tool_input)
    if name == "get_similar_verses":
        return await _execute_get_similar_verses(tool_input)
    return {"error": f"Unknown tool: {name}"}


# Citation validation

def validate_citations(content_blocks, retrieved_keys: set[str]) -> str | None:
    text = " ".join(
        block.text for block in content_blocks if hasattr(block, "text")
    )
    cited = set(re.findall(r"\b(\d{1,3}:\d{1,3})\b", text))
    unverified = cited - retrieved_keys
    if unverified:
        logger.warning("Unverified citations in response: %s", unverified)
        return (
            f"The following citations could not be verified against the retrieved corpus: "
            f"{', '.join(sorted(unverified))}"
        )
    return None


# Agentic loop

async def run_claude(user_message: str, task_prompt: str) -> ClaudeResult:
    system = f"{BASE_SYSTEM_PROMPT}\n\n{task_prompt}"
    messages = [{"role": "user", "content": user_message}]
    retrieved_verse_keys: set[str] = set()
    tool_calls_made = 0

    for iteration in range(MAX_ITERATIONS):
        response = await _get_client().messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

        logger.debug("Iteration %d: stop_reason=%s", iteration + 1, response.stop_reason)

        if response.stop_reason == "end_turn":
            text = "".join(
                block.text for block in response.content if hasattr(block, "text")
            )
            warning = validate_citations(response.content, retrieved_verse_keys)
            return ClaudeResult(
                text=text,
                retrieved_verse_keys=retrieved_verse_keys,
                warning=warning,
                tool_calls_made=tool_calls_made,
            )

        if response.stop_reason == "tool_use":
            # Append assistant turn
            messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue

                tool_calls_made += 1
                logger.debug("Tool call: %s(%s)", block.name, block.input)

                result = await execute_tool(block.name, block.input)

                # Track retrieved verse keys
                for r in result.get("results", []):
                    if "verse_key" in r:
                        retrieved_verse_keys.add(r["verse_key"])
                if "verse_key" in result:
                    retrieved_verse_keys.add(result["verse_key"])
                for sv in result.get("similar_verses", []):
                    if "verse_key" in sv:
                        retrieved_verse_keys.add(sv["verse_key"])

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })

            messages.append({"role": "user", "content": tool_results})

    raise RuntimeError(
        f"Claude did not finish within {MAX_ITERATIONS} tool-call iterations."
    )
