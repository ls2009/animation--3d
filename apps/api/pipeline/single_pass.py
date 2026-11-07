"""Single-pass pipeline: one model call produces a full script.

This is the Phase 3 plumbing prover. Flow per generation:
  queued -> directing (model call) -> inspecting (validation) -> ready|failed
Every step is an event row; state is derived from events, with
lessons.current_script as a cache of the last passed script.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from . import budgets
from .errors import (
    BudgetExceededError,
    GenerationError,
    ModelAuthError,
    ModelJsonError,
)
from .fingerprint import compute_fingerprint
from .model_client import ModelClient, cost_usd
from .store import Store
from .validate import validate_script

_PROMPT_VERSION_RE = re.compile(r"prompt_version:\s*(\S+)")


def _group_catalog(catalog: dict[str, Any]) -> str:
    by_domain: dict[str, list[str]] = {}
    for prop in catalog["props"]:
        by_domain.setdefault(prop["domain"], []).append(prop["name"])
    lines = []
    for domain in sorted(by_domain):
        lines.append(f"- {domain}: " + ", ".join(sorted(by_domain[domain])))
    return "\n".join(lines)


class SinglePassPipeline:
    def __init__(
        self,
        store: Store,
        model_client: ModelClient,
        *,
        repo_root: Path,
        prompt_path: Path,
        schema_path: Path,
        catalog_path: Path,
        model: str = "claude-opus-5-5",
    ):
        self.store = store
        self.model_client = model_client
        self.repo_root = repo_root
        self.model = model

        prompt_text = prompt_path.read_text(encoding="utf-8")
        match = _PROMPT_VERSION_RE.search(prompt_text)
        if not match:
            raise ValueError(f"{prompt_path} has no prompt_version header")
        self.prompt_version: str = match.group(1)

        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        self.prop_library_version: str = catalog["version"]
        schema = schema_path.read_text(encoding="utf-8")
        self.system_prompt = prompt_text.replace(
            "{{PROP_CATALOG}}", _group_catalog(catalog)
        ).replace("{{JSON_SCHEMA}}", schema)

    # -- fingerprint ---------------------------------------------------------
    def fingerprint(self, topic: str, audience: str, language: str) -> str:
        return compute_fingerprint(
            topic,
            audience,
            language,
            self.prop_library_version,
            self.prompt_version,
        )

    # -- generation ----------------------------------------------------------
    def run(self, lesson_id: str) -> None:
        """Background task body. Never raises: failures become status=failed
        plus a typed `failed` event."""
        lesson = self.store.get_lesson(lesson_id)
        if lesson is None:
            return
        try:
            self._generate(lesson_id, lesson.topic, lesson.audience, lesson.language)
        except GenerationError as err:
            self.store.save_event(
                lesson_id,
                "failed",
                role="single_pass",
                payload={"error_code": err.code, "message": err.message},
            )
            self.store.set_status(lesson_id, "failed")
        except Exception as err:  # noqa: BLE001 - last-resort guard for the ledger
            self.store.save_event(
                lesson_id,
                "failed",
                role="single_pass",
                payload={"error_code": "internal", "message": str(err)[:500]},
            )
            self.store.set_status(lesson_id, "failed")

    def _generate(self, lesson_id: str, topic: str, audience: str, language: str) -> None:
        self.store.save_event(
            lesson_id,
            "generation_started",
            role="single_pass",
            prompt_version=self.prompt_version,
            payload={
                "topic": topic,
                "audience": audience,
                "language": language,
                "pipeline": "single",
                "prop_library_version": self.prop_library_version,
            },
        )

        # Model call (the single pass). Budget: 1 call of MAX_TOKENS_PER_CALL.
        self.store.set_status(lesson_id, "directing")
        user_message = (
            f"Topic: {topic}\n"
            f"Audience: {audience}\n"
            f"Language: {language}\n\n"
            "Write the complete scene script now. Output only the JSON object."
        )
        try:
            response = self.model_client.complete(
                system=self.system_prompt,
                user=user_message,
                model=self.model,
                max_tokens=budgets.MAX_TOKENS_PER_CALL,
            )
        except Exception as err:
            if type(err).__name__ == "AuthenticationError":
                raise ModelAuthError(
                    "Anthropic rejected the credentials — set ANTHROPIC_API_KEY "
                    "in the environment (see .env.example)"
                ) from err
            raise
        self.store.save_event(
            lesson_id,
            "agent_call",
            role="single_pass",
            prompt_version=self.prompt_version,
            model=response.model,
            input_tokens=response.input_tokens,
            output_tokens=response.output_tokens,
            latency_ms=response.latency_ms,
            payload={
                "stop_reason": response.stop_reason,
                "cost_usd": cost_usd(response.model, response.input_tokens, response.output_tokens),
            },
        )
        if response.stop_reason == "max_tokens":
            raise BudgetExceededError(
                f"model output truncated at the {budgets.MAX_TOKENS_PER_CALL}-token cap"
            )

        raw = _parse_model_json(response.text)

        # Validation — the law. Repairs are logged, never silent.
        self.store.set_status(lesson_id, "inspecting")
        result = validate_script(raw, self.repo_root)
        self.store.save_event(
            lesson_id,
            "validator_repairs",
            role="validator",
            payload={
                "repair_count": result["stats"]["repairCount"],
                "by_code": result["stats"]["byCode"],
                "warnings": result["warnings"],
                "stats": result["stats"],
            },
        )

        script = result["script"]
        self.store.save_script(lesson_id, script, script["version"])
        self.store.save_event(
            lesson_id,
            "ready",
            role="single_pass",
            payload={
                "scenes": len(script["scenes"]),
                "actors": len(script["actors"]),
                "checks": len(script["checks"]),
            },
        )
        self.store.set_status(lesson_id, "ready")


def _parse_model_json(text: str) -> dict[str, Any]:
    """Model output must be one JSON object; tolerate stray code fences."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
        cleaned = re.sub(r"\s*```\s*$", "", cleaned)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as err:
        raise ModelJsonError(f"model did not return valid JSON: {err}") from err
    if not isinstance(parsed, dict):
        raise ModelJsonError(f"model returned {type(parsed).__name__}, expected an object")
    return parsed
