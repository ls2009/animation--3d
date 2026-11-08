"""Role contracts for the crew.

Each agent has ONE input contract and ONE output contract, validated before
the next role runs. Agents never see each other's reasoning — only these
validated artefacts. (The DSL's Zod schema stays the law for the final
script; these pydantic models are the same discipline applied to the
intermediate artefacts, since the pipeline is Python.)
"""

from __future__ import annotations

import json
import re
from typing import Literal

from pydantic import BaseModel, Field, ValidationError

from .errors import GenerationError


class ContractViolation(GenerationError):
    """A role's output failed its contract; the Producer consults the
    fails-back table."""

    code = "contract_violation"

    def __init__(self, role: str, message: str):
        super().__init__(f"{role}: {message}")
        self.role = role


# -- Director ----------------------------------------------------------------


class Beat(BaseModel):
    """What the learner sees happen -> what it proves -> the wrong belief it
    replaces. Plain language, no coordinates."""

    sees: str = Field(min_length=10, max_length=300)
    proves: str = Field(min_length=5, max_length=300)
    misconception: str = Field(min_length=5, max_length=300)


class Storyboard(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    beats: list[Beat] = Field(min_length=5, max_length=7)
    key_facts: list[str] = Field(min_length=5, max_length=7)


# -- Set designer --------------------------------------------------------------


class ActorSpec(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$", max_length=24)
    kind: Literal["prop", "text"] = "prop"
    prop: str | None = None
    label: str = Field(default="", max_length=80)
    color: str = "f"
    x: float = 0
    y: float = 0
    z: float = 0
    size: float = Field(default=2, gt=0, le=30)
    hidden: bool = False


class CameraSpec(BaseModel):
    x: float
    y: float
    z: float
    look: dict[str, float]


class PropRequest(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    why: str = Field(min_length=3, max_length=300)
    nearest_existing: str = Field(min_length=2, max_length=60)


class SetDesign(BaseModel):
    actors: list[ActorSpec] = Field(min_length=2, max_length=24)
    camera: CameraSpec
    layout_notes: list[str] = Field(default_factory=list, max_length=24)
    prop_requests: list[PropRequest] = Field(default_factory=list, max_length=8)


# -- Choreographer ---------------------------------------------------------------


class SceneChoreo(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    duration: float = Field(ge=3, le=60)
    backdrop: Literal["lab", "nature", "space", "plain"] = "lab"
    steps: list[dict] = Field(min_length=1, max_length=12)


class ControlSpec(BaseModel):
    id: str = Field(min_length=1, max_length=24)
    label: str = Field(min_length=1, max_length=60)
    min: float
    max: float
    default: float
    binds: list[dict] = Field(min_length=1, max_length=6)


class Choreography(BaseModel):
    scenes: list[SceneChoreo] = Field(min_length=5, max_length=7)
    controls: list[ControlSpec] = Field(default_factory=list, max_length=2)


# -- Narrator ----------------------------------------------------------------------


class NarrationSeg(BaseModel):
    t: float = Field(ge=0)
    text: str = Field(min_length=1, max_length=400)


class SceneNarration(BaseModel):
    narration: list[NarrationSeg] = Field(min_length=1, max_length=3)
    keyFact: str = Field(min_length=5, max_length=300)


class CheckSpec(BaseModel):
    question: str = Field(min_length=5, max_length=300)
    options: list[str] = Field(min_length=2, max_length=5)
    answer: int = Field(ge=0)
    explain: str = Field(default="", max_length=400)


class NarrationPlan(BaseModel):
    scenes: list[SceneNarration] = Field(min_length=5, max_length=7)
    checks: list[CheckSpec] = Field(min_length=3, max_length=3)


# -- Inspector ------------------------------------------------------------------------


class SceneVerdict(BaseModel):
    passed: bool = Field(alias="pass")
    reason: Literal["ok", "overlap", "off_camera", "content_wrong"] = "ok"
    fix_hint: str = Field(default="", max_length=400)

    model_config = {"populate_by_name": True}


class InspectorVerdicts(BaseModel):
    scenes: list[SceneVerdict] = Field(min_length=1, max_length=9)


# -- Shared parsing ------------------------------------------------------------------


def parse_model_json(role: str, text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
        cleaned = re.sub(r"\s*```\s*$", "", cleaned)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as err:
        raise ContractViolation(role, f"output is not valid JSON ({err})") from err
    if not isinstance(parsed, dict):
        raise ContractViolation(role, f"output is {type(parsed).__name__}, expected object")
    return parsed


def parse_contract(role: str, model_cls: type[BaseModel], text: str) -> BaseModel:
    data = parse_model_json(role, text)
    try:
        return model_cls.model_validate(data)
    except ValidationError as err:
        first = err.errors()[0]
        raise ContractViolation(
            role, f"contract failed at {'.'.join(str(p) for p in first['loc'])}: {first['msg']}"
        ) from err
