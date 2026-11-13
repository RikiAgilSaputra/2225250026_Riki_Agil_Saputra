"""Gemini (Google AI Studio) call for the modeler. The API key lives only on the server.

Uses the official `google-genai` SDK (Interactions API on generativelanguage.googleapis.com; the key is
sent as the `x-goog-api-key` header). Same contract as the TypeScript backend (modeler/gemini.ts): the
model only translates the story into WordProblemModel JSON, which is validated and then verified.
"""

import json
import logging
import time
from dataclasses import dataclass

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.core.config import get_settings
from app.services.modeler.prompt import SYSTEM_PROMPT
from app.services.modeler.schema import WordProblemModel

log = logging.getLogger(__name__)


class ModelerUnavailable(Exception):
    pass


class ModelerBusy(Exception):
    pass


@dataclass
class LlmResult:
    model: WordProblemModel | None
    refused: bool  # blocked by safety filters / not completed
    input_tokens: int
    output_tokens: int
    latency_ms: int
    model_id: str


EFFORT_TO_THINKING = {"low": "low", "medium": "medium", "high": "high", "xhigh": "high", "max": "high"}


def gemini_schema() -> dict:
    """Pydantic JSON Schema → the subset Gemini accepts: $refs inlined, nullable as a type array."""
    raw = WordProblemModel.model_json_schema()
    defs = raw.pop("$defs", {})

    def walk(node):
        if isinstance(node, list):
            return [walk(x) for x in node]
        if not isinstance(node, dict):
            return node
        if "$ref" in node:
            return walk(defs[node["$ref"].split("/")[-1]])
        out = {k: v for k, v in node.items() if k not in ("title", "$schema")}
        any_of = out.get("anyOf")
        if isinstance(any_of, list) and len(any_of) == 2 and any(s.get("type") == "null" for s in any_of):
            other = next(s for s in any_of if s.get("type") != "null")
            out.pop("anyOf")
            out.pop("default", None)
            return walk({**out, **other, "type": [other["type"], "null"]})
        return {k: walk(v) for k, v in out.items()}

    return walk(raw)


def from_interaction(interaction, latency_ms: int, fallback_model: str) -> LlmResult:
    """Maps a finished interaction (object or dict) to the modeler result."""
    get = (lambda o, k: o.get(k) if isinstance(o, dict) else getattr(o, k, None))
    usage = get(interaction, "usage") or {}
    tokens_in = get(usage, "total_input_tokens") or 0
    tokens_out = (get(usage, "total_output_tokens") or 0) + (get(usage, "total_thought_tokens") or 0)
    base = {"input_tokens": tokens_in, "output_tokens": tokens_out, "latency_ms": latency_ms,
            "model_id": get(interaction, "model") or fallback_model}
    text = get(interaction, "output_text")
    if get(interaction, "status") != "completed" or not text:
        return LlmResult(model=None, refused=True, **base)
    try:
        model = WordProblemModel.model_validate(json.loads(text))
    except (json.JSONDecodeError, ValidationError):
        model = None
    return LlmResult(model=model, refused=False, **base)


def model_order(main: str, fallback: str) -> list[str]:
    return [main, fallback] if fallback and fallback != main else [main]


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ModelerUnavailable("GEMINI_API_KEY is not set")
    if _client is None:
        # Google AI Studio only (vertexai=False); no SDK retries: the whole call has one time budget.
        _client = genai.Client(
            api_key=settings.gemini_api_key, vertexai=False,
            http_options=types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=1)),
        )
    return _client


def call_model(user_content: str) -> LlmResult:
    settings = get_settings()
    client = _get_client()
    started = time.monotonic()
    deadline = started + settings.modeler_timeout_seconds
    for model in model_order(settings.modeler_model, settings.modeler_fallback_model):
        remaining = deadline - time.monotonic()
        if remaining < 2:
            break
        try:
            interaction = client.interactions.create(
                model=model,
                system_instruction=SYSTEM_PROMPT,
                input=user_content,
                response_format={"type": "text", "mime_type": "application/json", "schema": gemini_schema()},
                generation_config={"thinking_level": EFFORT_TO_THINKING.get(settings.modeler_effort, "medium")},
                store=False,  # do not keep students' story text on Google's side after the request
                timeout=remaining,
            )
            return from_interaction(interaction, int((time.monotonic() - started) * 1000), model)
        except Exception as exc:  # noqa: BLE001 - classified by HTTP status below
            status = int(getattr(exc, "status_code", None) or getattr(exc, "code", None) or 0)
            log.error("gemini error model=%s status=%s %s: %s", model, status, type(exc).__name__, str(exc)[:500])
            if 400 <= status < 500 and status not in (408, 429):
                raise ModelerUnavailable(str(exc)) from exc  # bad key or bad request
            # overloaded, rate limited, network error or timeout → try the fallback model
    raise ModelerBusy()
