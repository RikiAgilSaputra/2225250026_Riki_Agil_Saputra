"""Claude API call for the modeler. The API key lives only on the server."""

import time
from dataclasses import dataclass

import anthropic

from app.core.config import get_settings
from app.services.modeler.prompt import SYSTEM_PROMPT
from app.services.modeler.schema import WordProblemModel


class ModelerUnavailable(Exception):
    pass


class ModelerBusy(Exception):
    pass


@dataclass
class LlmResult:
    model: WordProblemModel | None
    refused: bool
    input_tokens: int
    output_tokens: int
    latency_ms: int
    model_id: str


_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise ModelerUnavailable("ANTHROPIC_API_KEY is not set")
    if _client is None:
        _client = anthropic.Anthropic(
            api_key=settings.anthropic_api_key, timeout=settings.modeler_timeout_seconds, max_retries=2
        )
    return _client


def call_model(user_content: str) -> LlmResult:
    settings = get_settings()
    client = _get_client()
    started = time.monotonic()
    try:
        response = client.messages.parse(
            model=settings.modeler_model,
            max_tokens=16000,
            output_config={"effort": settings.modeler_effort},
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_content}],
            output_format=WordProblemModel,
        )
    except anthropic.RateLimitError as exc:
        raise ModelerBusy() from exc
    except anthropic.APIStatusError as exc:
        if exc.status_code >= 500:
            raise ModelerBusy() from exc
        raise ModelerUnavailable(str(exc)) from exc
    except anthropic.APIConnectionError as exc:
        raise ModelerBusy() from exc
    latency = int((time.monotonic() - started) * 1000)
    usage = response.usage
    refused = response.stop_reason == "refusal"
    return LlmResult(
        model=None if refused else response.parsed_output,
        refused=refused,
        input_tokens=(usage.input_tokens or 0) + (getattr(usage, "cache_read_input_tokens", 0) or 0),
        output_tokens=usage.output_tokens or 0,
        latency_ms=latency,
        model_id=response.model,
    )
