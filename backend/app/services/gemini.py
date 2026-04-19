import json
import logging
import re

from google import genai
from google.genai import types

from app.config import settings
from app.services.claude import ClaudeResult, execute_tool, validate_citations

logger = logging.getLogger(__name__)

MODEL = "gemini-2.0-flash"
MAX_ITERATIONS = 5

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


# Tool declarations in Gemini format
GEMINI_TOOLS = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="search_corpus",
            description=(
                "Search the Quranic corpus for verses relevant to a topic or concept. "
                "Returns verses with Arabic text, English translation, and tafsir commentary. "
                "You MUST call this tool before citing any verse — never quote from memory."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "query": types.Schema(
                        type=types.Type.STRING,
                        description="Semantic search query",
                    ),
                    "top_k": types.Schema(
                        type=types.Type.INTEGER,
                        description="Number of results to return (max 20)",
                    ),
                    "topic_filter": types.Schema(
                        type=types.Type.STRING,
                        description="Optional: restrict results to a specific topic name",
                    ),
                },
                required=["query"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_verse",
            description="Retrieve a specific verse by key (e.g. '2:155'). Use when you know the exact verse needed.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "verse_key": types.Schema(
                        type=types.Type.STRING,
                        description="Verse key in format surah:ayah e.g. '2:155'",
                    ),
                },
                required=["verse_key"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_similar_verses",
            description="Given a verse key, return linguistically similar verses that share phrases or words.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "verse_key": types.Schema(type=types.Type.STRING),
                    "limit": types.Schema(type=types.Type.INTEGER),
                },
                required=["verse_key"],
            ),
        ),
    ]
)

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


def _extract_text(response: types.GenerateContentResponse) -> str:
    parts = response.candidates[0].content.parts if response.candidates else []
    return "".join(p.text for p in parts if hasattr(p, "text") and p.text)


def _extract_function_calls(response: types.GenerateContentResponse) -> list:
    parts = response.candidates[0].content.parts if response.candidates else []
    return [p.function_call for p in parts if p.function_call]


def _is_finished(response: types.GenerateContentResponse) -> bool:
    if not response.candidates:
        return True
    finish_reason = response.candidates[0].finish_reason
    # STOP = normal end, other values mean tool use or error
    return str(finish_reason) in ("FinishReason.STOP", "STOP", "1")


async def run_gemini(user_message: str, task_prompt: str) -> ClaudeResult:
    system = f"{BASE_SYSTEM_PROMPT}\n\n{task_prompt}"
    retrieved_verse_keys: set[str] = set()
    tool_calls_made = 0

    # Build initial message history
    contents: list[types.Content] = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(user_message)],
        )
    ]

    for iteration in range(MAX_ITERATIONS):
        response = await _get_client().aio.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system,
                tools=[GEMINI_TOOLS],
                temperature=0.3,
                max_output_tokens=4096,
            ),
        )

        logger.debug("Gemini iteration %d finished", iteration + 1)

        function_calls = _extract_function_calls(response)

        if not function_calls:
            # No tool calls — final response
            text = _extract_text(response)
            warning = _check_unverified_citations(text, retrieved_verse_keys)
            return ClaudeResult(
                text=text,
                retrieved_verse_keys=retrieved_verse_keys,
                warning=warning,
                tool_calls_made=tool_calls_made,
            )

        # Append model turn
        contents.append(response.candidates[0].content)

        # Execute all function calls and collect responses
        function_responses = []
        for fc in function_calls:
            tool_calls_made += 1
            logger.debug("Gemini tool call: %s(%s)", fc.name, dict(fc.args))

            result = await execute_tool(fc.name, dict(fc.args))

            # Track retrieved verse keys
            for r in result.get("results", []):
                if "verse_key" in r:
                    retrieved_verse_keys.add(r["verse_key"])
            if "verse_key" in result:
                retrieved_verse_keys.add(result["verse_key"])
            for sv in result.get("similar_verses", []):
                if "verse_key" in sv:
                    retrieved_verse_keys.add(sv["verse_key"])

            function_responses.append(
                types.Part.from_function_response(
                    name=fc.name,
                    response=result,
                )
            )

        # Append tool results turn
        contents.append(
            types.Content(role="user", parts=function_responses)
        )

    raise RuntimeError(
        f"Gemini did not finish within {MAX_ITERATIONS} tool-call iterations."
    )


def _check_unverified_citations(text: str, retrieved_keys: set[str]) -> str | None:
    cited = set(re.findall(r"\b(\d{1,3}:\d{1,3})\b", text))
    unverified = cited - retrieved_keys
    if unverified:
        logger.warning("Unverified Gemini citations: %s", unverified)
        return (
            f"The following citations could not be verified against the retrieved corpus: "
            f"{', '.join(sorted(unverified))}"
        )
    return None
