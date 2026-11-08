import json
import shutil
from pathlib import Path

import pytest

from pipeline.model_client import ModelResponse
from pipeline.single_pass import SinglePassPipeline
from pipeline.store import SqliteStore

API_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = API_DIR.parents[1]

TSX_AVAILABLE = (REPO_ROOT / "packages/engine/node_modules/.bin/tsx").exists() or bool(
    shutil.which("tsx")
)

SAMPLE_SCRIPT = {
    "version": "1.0",
    "title": "Test lesson",
    "language": "en",
    "camera": {"x": 14, "y": 12, "z": 30, "look": {"x": 0, "y": 6, "z": 0}},
    "actors": [
        {"id": "a1", "kind": "prop", "prop": "piston", "label": "P", "color": "a",
         "x": 0, "y": 0, "z": 0, "size": 2, "hidden": False},
        # Unknown prop: must trigger exactly one unknown_prop repair.
        {"id": "a2", "kind": "prop", "prop": "warp-drive", "label": "W", "color": "b",
         "x": 6, "y": 0, "z": 0, "size": 2, "hidden": False},
    ],
    "scenes": [
        {
            "title": "S1", "duration": 10, "backdrop": "lab",
            "beat": "the piston visibly moves up",
            "narration": [{"t": 0, "text": "hello"}, {"t": 5, "text": "world"}],
            "keyFact": "a fact",
            "steps": [
                {"action": "move", "actor": "a1", "t": 1, "dur": 3,
                 "to": {"x": 0, "y": 4, "z": 0}},
            ],
        }
    ],
    "controls": [],
    "checks": [
        {"question": "q?", "options": ["x", "y"], "answer": 1, "explain": "because"},
    ],
}


class FakeModel:
    """Scripted model client: returns queued responses, counts calls."""

    def __init__(self, responses: list[ModelResponse]):
        self.responses = list(responses)
        self.calls = 0
        self.seen: list[dict] = []

    def complete(self, *, system, user, model, max_tokens):  # noqa: ANN001
        self.calls += 1
        self.seen.append({"system": system, "user": user, "model": model})
        if not self.responses:
            raise AssertionError("FakeModel exhausted — unexpected extra model call")
        return self.responses.pop(0)

    def complete_blocks(self, *, system, blocks, model, max_tokens):  # noqa: ANN001
        self.calls += 1
        self.seen.append({"system": system, "blocks": blocks, "model": model})
        if not self.responses:
            raise AssertionError("FakeModel exhausted — unexpected extra model call")
        return self.responses.pop(0)


def model_response(text: str, stop_reason: str = "end_turn") -> ModelResponse:
    return ModelResponse(
        text=text,
        model="claude-opus-5-5",
        input_tokens=1000,
        output_tokens=2000,
        latency_ms=1234,
        stop_reason=stop_reason,
    )


@pytest.fixture()
def store(tmp_path: Path) -> SqliteStore:
    return SqliteStore(tmp_path / "test.db")


def make_pipeline(store: SqliteStore, fake: FakeModel) -> SinglePassPipeline:
    return SinglePassPipeline(
        store,
        fake,
        repo_root=REPO_ROOT,
        prompt_path=API_DIR / "prompts" / "single-pass.md",
        schema_path=REPO_ROOT / "packages" / "dsl" / "schema.json",
        catalog_path=REPO_ROOT / "packages" / "engine" / "props.catalog.json",
    )


@pytest.fixture()
def good_model() -> FakeModel:
    return FakeModel([model_response(json.dumps(SAMPLE_SCRIPT))])
