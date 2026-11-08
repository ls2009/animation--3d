"""The Producer: no model of its own. Orchestrates the crew, enforces
budgets, consults the fails-back table, writes an event per call and
produces the final script.

Role chain and fails-back (mission table):
  Director (complex)      -> fails back to the user (typed error)
  Set designer (default)  -> Director (once)
  Choreographer (default) -> Set designer (once)
  Narrator (default)      -> Choreographer (once)
  Inspector (default+vision) -> Choreographer (max 2 loops)

Budget accounting (see budgets.py): MAX_MODEL_CALLS governs the authoring
chain (director/set/choreographer/narrator + fails-back re-runs: happy
path 4 calls, one fallback cycle 6). Inspection calls are governed by
MAX_INSPECTOR_LOOPS (initial inspection + per-loop choreographer fix and
re-inspection). Exceeding either fails the generation with a typed error.
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from pathlib import Path
from typing import Any

from . import budgets
from .contracts import (
    Choreography,
    ContractViolation,
    InspectorVerdicts,
    NarrationPlan,
    SetDesign,
    Storyboard,
    parse_contract,
)
from .embeddings import embed
from .errors import BudgetExceededError, GenerationError
from .fingerprint import compute_fingerprint
from .inspector_render import KeyframeRenderer, make_cli_renderer
from .model_client import ModelClient, cost_usd
from .store import Store
from .validate import validate_script

_PROMPT_VERSION_RE = re.compile(r"prompt_version:\s*(\S+)")

ROLES = ("director", "set-designer", "choreographer", "narrator", "inspector")


class InspectionFailedError(GenerationError):
    """A wrong lesson is never shipped."""

    code = "inspection_failed"


def _catalog_lines(catalog: dict[str, Any]) -> str:
    by_domain: dict[str, list[str]] = {}
    for prop in catalog["props"]:
        alias = f" ({', '.join(prop['aliases'])})" if prop["aliases"] else ""
        by_domain.setdefault(prop["domain"], []).append(prop["name"] + alias)
    return "\n".join(
        f"- {domain}: " + ", ".join(sorted(names)) for domain, names in sorted(by_domain.items())
    )


class CrewPipeline:
    def __init__(
        self,
        store: Store,
        model_client: ModelClient,
        *,
        repo_root: Path,
        prompt_dir: Path,
        catalog_path: Path,
        model_complex: str = "claude-opus-5-5",
        model_default: str = "claude-sonnet-5-5",
        keyframe_renderer: KeyframeRenderer | None = None,
        embed_fn: Callable[[str], list[float] | None] = embed,
        prop_backlog_path: Path | None = None,
    ):
        self.store = store
        self.model_client = model_client
        self.repo_root = repo_root
        self.model_complex = model_complex
        self.model_default = model_default
        self.renderer: KeyframeRenderer = keyframe_renderer or make_cli_renderer(repo_root)
        self.embed_fn = embed_fn
        self.prop_backlog_path = prop_backlog_path

        self.prompts: dict[str, str] = {}
        self.versions: dict[str, str] = {}
        for role in ROLES:
            text = (prompt_dir / f"{role}.md").read_text(encoding="utf-8")
            match = _PROMPT_VERSION_RE.search(text)
            if not match:
                raise ValueError(f"{role}.md has no prompt_version header")
            self.prompts[role] = text
            self.versions[role] = match.group(1)

        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        self.prop_library_version: str = catalog["version"]
        self.catalog_text = _catalog_lines(catalog)

        # One composite version: bump any role prompt and every fingerprint moves.
        self.prompt_version = "crew@" + "+".join(self.versions[r] for r in ROLES)
        self.model = f"{model_complex}+{model_default}"

    # -- shared interface with SinglePassPipeline -----------------------------
    def fingerprint(self, topic: str, audience: str, language: str) -> str:
        return compute_fingerprint(
            topic, audience, language, self.prop_library_version, self.prompt_version
        )

    def run(self, lesson_id: str) -> None:
        lesson = self.store.get_lesson(lesson_id)
        if lesson is None:
            return
        try:
            self._generate(lesson_id, lesson.topic, lesson.audience, lesson.language)
        except GenerationError as err:
            self.store.save_event(
                lesson_id,
                "failed",
                role="producer",
                payload={"error_code": err.code, "message": err.message},
            )
            self.store.set_status(lesson_id, "failed")
        except Exception as err:  # noqa: BLE001 — last-resort guard for the ledger
            self.store.save_event(
                lesson_id,
                "failed",
                role="producer",
                payload={"error_code": "internal", "message": str(err)[:500]},
            )
            self.store.set_status(lesson_id, "failed")

    # -- internals -------------------------------------------------------------
    def _call(
        self,
        lesson_id: str,
        role: str,
        *,
        model: str,
        system: str,
        user: str | None = None,
        blocks: list[dict] | None = None,
    ) -> str:
        if blocks is not None:
            response = self.model_client.complete_blocks(
                system=system, blocks=blocks, model=model,
                max_tokens=budgets.MAX_TOKENS_PER_CALL,
            )
        else:
            response = self.model_client.complete(
                system=system, user=user or "", model=model,
                max_tokens=budgets.MAX_TOKENS_PER_CALL,
            )
        self.store.save_event(
            lesson_id,
            "agent_call",
            role=role,
            prompt_version=self.versions.get(role, self.prompt_version),
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
                f"{role} output truncated at the {budgets.MAX_TOKENS_PER_CALL}-token cap"
            )
        return response.text

    def _generate(self, lesson_id: str, topic: str, audience: str, language: str) -> None:
        store = self.store
        store.save_event(
            lesson_id,
            "generation_started",
            role="producer",
            prompt_version=self.prompt_version,
            payload={
                "topic": topic, "audience": audience, "language": language,
                "pipeline": "crew", "prop_library_version": self.prop_library_version,
            },
        )

        authoring_calls = 0

        def authoring_budget() -> None:
            nonlocal authoring_calls
            authoring_calls += 1
            if authoring_calls > budgets.MAX_MODEL_CALLS:
                raise BudgetExceededError(
                    f"authoring chain exceeded {budgets.MAX_MODEL_CALLS} model calls"
                )

        # ---- Director (exemplars via pgvector, zero-exemplar fallback) -------
        store.set_status(lesson_id, "directing")
        embedding = self.embed_fn(f"{topic} — for {audience}")
        exemplars: list[dict] = (
            store.nearest_storyboards(embedding, 3) if embedding is not None else []
        )
        exemplar_text = (
            "## Exemplar storyboards (passed inspection on related topics)\n\n"
            + "\n".join(f"```json\n{json.dumps(e)}\n```" for e in exemplars[:3])
            if exemplars
            else ""
        )
        director_system = self.prompts["director"].replace("{{EXEMPLARS}}", exemplar_text)
        director_user = f"Topic: {topic}\nAudience: {audience}\nLanguage: {language}"

        def run_director() -> Storyboard:
            authoring_budget()
            text = self._call(
                lesson_id, "director", model=self.model_complex,
                system=director_system, user=director_user,
            )
            return parse_contract("director", Storyboard, text)  # type: ignore[return-value]

        storyboard = run_director()  # Director fails back to the user: no retry.

        # ---- Set designer (fails back to Director, once) ----------------------
        store.set_status(lesson_id, "designing")
        set_system = self.prompts["set-designer"].replace("{{PROP_CATALOG}}", self.catalog_text)

        def run_set_designer(sb: Storyboard) -> SetDesign:
            authoring_budget()
            text = self._call(
                lesson_id, "set-designer", model=self.model_default,
                system=set_system,
                user="Storyboard:\n" + sb.model_dump_json(),
            )
            return parse_contract("set-designer", SetDesign, text)  # type: ignore[return-value]

        try:
            set_design = run_set_designer(storyboard)
        except ContractViolation:
            storyboard = run_director()
            set_design = run_set_designer(storyboard)

        # ---- Choreographer (fails back to Set designer, once) ------------------
        store.set_status(lesson_id, "choreographing")

        def run_choreographer(
            sd: SetDesign, fix_hints: list[str] | None = None, *, counted: bool = True
        ) -> Choreography:
            if counted:
                authoring_budget()
            hints = (
                "\n## Inspector fix hints (apply them)\n- " + "\n- ".join(fix_hints)
                if fix_hints
                else ""
            )
            system = self.prompts["choreographer"].replace("{{FIX_HINTS}}", hints)
            user = (
                "Storyboard:\n" + storyboard.model_dump_json()
                + "\n\nActors (fixed):\n" + sd.model_dump_json(include={"actors", "camera"})
            )
            text = self._call(
                lesson_id, "choreographer", model=self.model_default, system=system, user=user
            )
            return parse_contract("choreographer", Choreography, text)  # type: ignore[return-value]

        try:
            choreo = run_choreographer(set_design)
        except ContractViolation:
            set_design = run_set_designer(storyboard)
            choreo = run_choreographer(set_design)

        # ---- Narrator (fails back to Choreographer, once) -----------------------
        def run_narrator(ch: Choreography, *, counted: bool = True) -> NarrationPlan:
            if counted:
                authoring_budget()
            timeline = [
                {
                    "scene": i + 1,
                    "title": s.title,
                    "duration": s.duration,
                    "step_times": sorted({float(st.get("t", 0)) for st in s.steps}),
                }
                for i, s in enumerate(ch.scenes)
            ]
            user = (
                "Storyboard:\n" + storyboard.model_dump_json()
                + f"\n\nLanguage: {language}\n\nScene timeline:\n" + json.dumps(timeline)
            )
            text = self._call(
                lesson_id, "narrator", model=self.model_default,
                system=self.prompts["narrator"], user=user,
            )
            plan = parse_contract("narrator", NarrationPlan, text)
            if len(plan.scenes) != len(ch.scenes):  # type: ignore[attr-defined]
                raise ContractViolation(
                    "narrator", f"wrote {len(plan.scenes)} scenes for {len(ch.scenes)}"  # type: ignore[attr-defined]
                )
            return plan  # type: ignore[return-value]

        try:
            narration = run_narrator(choreo)
        except ContractViolation:
            choreo = run_choreographer(set_design)
            narration = run_narrator(choreo)

        # ---- Assemble + validate (the law) -------------------------------------
        store.set_status(lesson_id, "inspecting")

        def assemble(ch: Choreography, np: NarrationPlan) -> dict[str, Any]:
            scenes = []
            for i, scene in enumerate(ch.scenes):
                beat = storyboard.beats[i].sees if i < len(storyboard.beats) else ""
                narr = np.scenes[i] if i < len(np.scenes) else None
                scenes.append(
                    {
                        "title": scene.title,
                        "duration": scene.duration,
                        "backdrop": scene.backdrop,
                        "beat": beat,
                        "narration": [seg.model_dump() for seg in narr.narration] if narr else [],
                        "keyFact": narr.keyFact if narr else "",
                        "steps": scene.steps,
                    }
                )
            return {
                "version": "1.0",
                "title": storyboard.title,
                "language": language,
                "camera": set_design.camera.model_dump(),
                "actors": [a.model_dump() for a in set_design.actors],
                "scenes": scenes,
                "controls": [c.model_dump() for c in choreo.controls],
                "checks": [c.model_dump() for c in narration.checks],
            }

        def validate_and_log(raw: dict[str, Any]) -> dict[str, Any]:
            result = validate_script(raw, self.repo_root)
            store.save_event(
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
            return result["script"]

        script = validate_and_log(assemble(choreo, narration))

        # ---- Inspector (deterministic validation already done; now the eye) ----
        def inspect(current: dict[str, Any], loop: int) -> InspectorVerdicts:
            frames = self.renderer(current)
            blocks: list[dict] = []
            for i, scene in enumerate(current["scenes"]):
                notes = set_design.layout_notes
                blocks.append(
                    {
                        "type": "text",
                        "text": (
                            f"Scene {i + 1}: {scene['title']}\n"
                            f"BEAT (must be visible): {scene['beat']}\n"
                            f"Narration: " + " / ".join(n["text"] for n in scene["narration"])
                            + ("\nLayout notes: " + "; ".join(notes) if notes else "")
                        ),
                    }
                )
                import base64

                blocks.append(
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": base64.b64encode(frames[i]).decode("ascii"),
                        },
                    }
                )
            blocks.append(
                {"type": "text", "text": "Judge every scene now. Output only the JSON object."}
            )
            text = self._call(
                lesson_id, "inspector", model=self.model_default,
                system=self.prompts["inspector"], blocks=blocks,
            )
            verdicts = parse_contract("inspector", InspectorVerdicts, text)
            pass_rate = (
                sum(1 for v in verdicts.scenes if v.passed) / len(verdicts.scenes)  # type: ignore[attr-defined]
                if verdicts.scenes  # type: ignore[attr-defined]
                else 0.0
            )
            store.save_event(
                lesson_id,
                "inspection",
                role="inspector",
                payload={
                    "loop": loop,
                    "pass_rate": round(pass_rate, 4),
                    "verdicts": [v.model_dump(by_alias=True) for v in verdicts.scenes],  # type: ignore[attr-defined]
                },
            )
            return verdicts  # type: ignore[return-value]

        def acceptable(verdicts: InspectorVerdicts, final: bool) -> bool:
            failures = [v for v in verdicts.scenes if not v.passed]  # type: ignore[attr-defined]
            if not failures:
                return True
            if final:
                cosmetic = [f for f in failures if f.reason in ("overlap", "off_camera")]
                return len(failures) == 1 and len(cosmetic) == 1
            return False

        verdicts = inspect(script, loop=0)
        loops = 0
        while not acceptable(verdicts, final=loops >= budgets.MAX_INSPECTOR_LOOPS - 1) and (
            loops < budgets.MAX_INSPECTOR_LOOPS
        ):
            loops += 1
            hints = [v.fix_hint for v in verdicts.scenes if not v.passed and v.fix_hint]  # type: ignore[attr-defined]
            # Repair-loop calls are budgeted by MAX_INSPECTOR_LOOPS, not the
            # authoring cap (see budgets.py).
            choreo = run_choreographer(set_design, fix_hints=hints, counted=False)
            try:
                narration = run_narrator(choreo, counted=False)
            except ContractViolation:
                pass  # keep prior narration; timings are approximate by design
            script = validate_and_log(assemble(choreo, narration))
            verdicts = inspect(script, loop=loops)

        if not acceptable(verdicts, final=True):
            reasons = sorted({v.reason for v in verdicts.scenes if not v.passed})  # type: ignore[attr-defined]
            raise InspectionFailedError(
                f"scenes still failing after {loops} repair loop(s): {', '.join(reasons)} — "
                "a wrong lesson is never shipped"
            )

        # ---- Ship -----------------------------------------------------------------
        store.save_script(lesson_id, script, script["version"])
        store.save_storyboard(lesson_id, storyboard.model_dump(), True, embedding)
        for request in set_design.prop_requests:
            count = store.upsert_prop_request(request.name, request.nearest_existing, lesson_id)
            self._append_prop_backlog(request, count)
        store.save_event(
            lesson_id,
            "ready",
            role="producer",
            payload={
                "scenes": len(script["scenes"]),
                "actors": len(script["actors"]),
                "checks": len(script["checks"]),
                "inspector_loops": loops,
                "authoring_calls": authoring_calls,
            },
        )
        store.set_status(lesson_id, "ready")

    def _append_prop_backlog(self, request, count: int) -> None:
        """Mirror prop requests into docs/prop-backlog.md when it is present
        (local/dev checkouts); the store row is the primary record."""
        path = self.prop_backlog_path
        if path is None or not path.exists():
            return
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
            marker = f"| {request.name} |"
            row = f"| {request.name} | {count} | {request.nearest_existing} | {request.why} |"
            replaced = False
            for i, line in enumerate(lines):
                if line.startswith(marker):
                    lines[i] = row
                    replaced = True
                    break
            if not replaced:
                lines.append(row)
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        except OSError:
            pass
