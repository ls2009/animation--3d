"""Model access for the pipeline. One protocol, one real client, pricing.

The browser never sees the Anthropic key; everything model-related happens
here, server-side.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Protocol

# USD per 1M tokens (input, output). Source: Anthropic price list.
PRICING: dict[str, tuple[float, float]] = {
    "claude-opus-5-5": (4.00, 20.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-5-5": (0.10, 0.50),
}


def cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    inp, outp = PRICING.get(model, (0.0, 0.0))
    return round((input_tokens * inp + output_tokens * outp) / 1_000_000, 6)


@dataclass
class ModelResponse:
    text: str
    model: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    stop_reason: str


class ModelClient(Protocol):
    def complete(self, *, system: str, user: str, model: str, max_tokens: int) -> ModelResponse: ...

    def complete_blocks(
        self, *, system: str, blocks: list[dict], model: str, max_tokens: int
    ) -> ModelResponse:
        """Multimodal variant: `blocks` are Anthropic content blocks (text +
        base64 images). Used by the Inspector."""
        ...


class AnthropicClient:
    """Real client. In the cloud session the egress proxy injects auth; the
    SDK still requires a key string locally, so a placeholder is accepted."""

    def __init__(self) -> None:
        from anthropic import Anthropic

        self._client = Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY") or "proxy-managed",
            max_retries=2,
        )

    def complete(self, *, system: str, user: str, model: str, max_tokens: int) -> ModelResponse:
        return self.complete_blocks(
            system=system,
            blocks=[{"type": "text", "text": user}],
            model=model,
            max_tokens=max_tokens,
        )

    def complete_blocks(
        self, *, system: str, blocks: list[dict], model: str, max_tokens: int
    ) -> ModelResponse:
        started = time.monotonic()
        response = self._client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=[
                {
                    "type": "text",
                    "text": system,
                    # Role prompts are identical across generations — cache.
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": blocks}],
        )
        latency_ms = int((time.monotonic() - started) * 1000)
        text = "".join(block.text for block in response.content if block.type == "text")
        return ModelResponse(
            text=text,
            model=response.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            latency_ms=latency_ms,
            stop_reason=response.stop_reason or "end_turn",
        )
