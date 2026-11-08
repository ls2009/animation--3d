import json
from pathlib import Path

import pytest

from pipeline.producer import CrewPipeline
from tests.conftest import REPO_ROOT, TSX_AVAILABLE, FakeModel, model_response

API_DIR = Path(__file__).resolve().parents[1]

needs_tsx = pytest.mark.skipif(
    not TSX_AVAILABLE, reason="validator bridge needs tsx (run pnpm install)"
)

# -- scripted role outputs (all contract-valid) --------------------------------

STORYBOARD = {
    "title": "How a turbo works",
    "beats": [
        {
            "sees": f"beat {i}: the turbine visibly spins faster as exhaust hits it",
            "proves": "exhaust energy is recycled",
            "misconception": "turbos burn extra fuel to add power",
        }
        for i in range(5)
    ],
    "key_facts": [f"fact {i}" for i in range(5)],
}

SET_DESIGN = {
    "actors": [
        {"id": "turbo", "prop": "turbine", "label": "Turbine", "color": "a",
         "x": 0, "y": 0, "z": 0, "size": 3},
        {"id": "eng", "prop": "engine-cylinder", "label": "Engine", "color": "f",
         "x": 8, "y": 0, "z": 0, "size": 5},
    ],
    "camera": {"x": 12, "y": 9, "z": 24, "look": {"x": 4, "y": 3, "z": 0}},
    "layout_notes": ["turbo left of the engine for a clear flow path"],
    "prop_requests": [
        {"name": "intercooler", "why": "charge cooling visual", "nearest_existing": "pump"},
    ],
}

CHOREO = {
    "scenes": [
        {
            "title": f"Scene {i + 1}",
            "duration": 10,
            "backdrop": "lab",
            "steps": [
                {"action": "rotate", "actor": "turbo", "t": 1, "dur": 8, "axis": "z", "turns": 3},
                {"action": "flow", "from": "eng", "to": "turbo", "t": 1, "dur": 8,
                 "count": 8, "shape": "sphere", "color": "o"},
            ],
        }
        for i in range(5)
    ],
    "controls": [],
}

NARRATION = {
    "scenes": [
        {
            "narration": [{"t": 0, "text": f"scene {i} opens"}, {"t": 5, "text": "and develops"}],
            "keyFact": f"key fact {i} stays memorable",
        }
        for i in range(5)
    ],
    "checks": [
        {"question": f"What does beat {i} prove about the turbo?",
         "options": ["a", "b", "c"], "answer": 0, "explain": "because"}
        for i in range(3)
    ],
}

ALL_PASS = {"scenes": [{"pass": True, "reason": "ok", "fix_hint": ""} for _ in range(5)]}


def verdicts_with_failure(reason: str, count: int = 1):
    scenes = [{"pass": True, "reason": "ok", "fix_hint": ""} for _ in range(5)]
    for i in range(count):
        scenes[i] = {"pass": False, "reason": reason, "fix_hint": f"fix scene {i + 1} ({reason})"}
    return {"scenes": scenes}


def j(obj) -> str:
    return json.dumps(obj)


FAKE_PNG = b"\x89PNG fake"


def make_crew(store, fake: FakeModel, embed_fn=lambda _t: None) -> CrewPipeline:
    return CrewPipeline(
        store,
        fake,
        repo_root=REPO_ROOT,
        prompt_dir=API_DIR / "prompts",
        catalog_path=REPO_ROOT / "packages" / "engine" / "props.catalog.json",
        keyframe_renderer=lambda script: [FAKE_PNG] * len(script["scenes"]),
        embed_fn=embed_fn,
    )


def happy_sequence():
    return [
        model_response(j(STORYBOARD)),
        model_response(j(SET_DESIGN)),
        model_response(j(CHOREO)),
        model_response(j(NARRATION)),
        model_response(j(ALL_PASS)),
    ]


def roles_called(store, lesson_id):
    return [
        e["role"] for e in store.list_events(lesson_id) if e["kind"] == "agent_call"
    ]


@needs_tsx
def test_crew_happy_path(store):
    fake = FakeModel(happy_sequence())
    crew = make_crew(store, fake, embed_fn=lambda _t: [0.5, 0.5, 0.1])
    lesson = store.create_lesson(crew.fingerprint("turbo", "teens", "en"), "turbo", "teens", "en")
    crew.run(lesson.id)

    refreshed = store.get_lesson(lesson.id)
    assert refreshed.status == "ready"
    script = refreshed.current_script
    assert script["title"] == "How a turbo works"
    assert len(script["scenes"]) == 5
    assert script["scenes"][0]["beat"].startswith("beat 0")
    assert len(script["checks"]) == 3
    assert fake.calls == 5

    assert roles_called(store, lesson.id) == [
        "director", "set-designer", "choreographer", "narrator", "inspector",
    ]
    inspections = [e for e in store.list_events(lesson.id) if e["kind"] == "inspection"]
    assert len(inspections) == 1
    assert inspections[0]["payload"]["pass_rate"] == 1.0

    ready = [e for e in store.list_events(lesson.id) if e["kind"] == "ready"][0]
    assert ready["payload"]["inspector_loops"] == 0
    assert ready["payload"]["authoring_calls"] == 4

    # Storyboard saved as a passed exemplar (embedding provided).
    assert store.nearest_storyboards([0.5, 0.5, 0.1], 3)[0]["title"] == "How a turbo works"
    # Prop request upserted.
    requests = store.list_prop_requests()
    assert requests[0]["name"] == "intercooler" and requests[0]["count"] == 1

    # Director saw no exemplars (store was empty at call time).
    assert "Exemplar storyboards" not in fake.seen[0]["system"]


@needs_tsx
def test_zero_exemplar_fallback_and_exemplar_injection(store):
    # First lesson: no embedding key -> zero exemplars, still succeeds.
    fake1 = FakeModel(happy_sequence())
    crew1 = make_crew(store, fake1, embed_fn=lambda _t: None)
    lesson1 = store.create_lesson("fp-a", "turbo", "teens", "en")
    crew1.run(lesson1.id)
    assert store.get_lesson(lesson1.id).status == "ready"

    # Second lesson with embeddings available and one passed exemplar stored.
    store.save_storyboard(lesson1.id, STORYBOARD, True, [1.0, 0.0])
    fake2 = FakeModel(happy_sequence())
    crew2 = make_crew(store, fake2, embed_fn=lambda _t: [1.0, 0.0])
    lesson2 = store.create_lesson("fp-b", "supercharger", "teens", "en")
    crew2.run(lesson2.id)
    assert "Exemplar storyboards" in fake2.seen[0]["system"]


@needs_tsx
def test_set_designer_contract_failure_falls_back_to_director_once(store):
    fake = FakeModel(
        [
            model_response(j(STORYBOARD)),
            model_response("not json"),  # set designer violates contract
            model_response(j(STORYBOARD)),  # director re-run (once)
            model_response(j(SET_DESIGN)),
            model_response(j(CHOREO)),
            model_response(j(NARRATION)),
            model_response(j(ALL_PASS)),
        ]
    )
    crew = make_crew(store, fake)
    lesson = store.create_lesson("fp-fallback", "t", "a", "en")
    crew.run(lesson.id)
    assert store.get_lesson(lesson.id).status == "ready"
    assert roles_called(store, lesson.id) == [
        "director", "set-designer", "director", "set-designer",
        "choreographer", "narrator", "inspector",
    ]
    ready = [e for e in store.list_events(lesson.id) if e["kind"] == "ready"][0]
    assert ready["payload"]["authoring_calls"] == 6  # at the cap, not over


def test_director_failure_is_typed_to_the_user(store):
    fake = FakeModel([model_response(j({"title": "x", "beats": [], "key_facts": []}))])
    crew = make_crew(store, fake)
    lesson = store.create_lesson("fp-dir", "t", "a", "en")
    crew.run(lesson.id)
    failed = [e for e in store.list_events(lesson.id) if e["kind"] == "failed"][0]
    assert failed["payload"]["error_code"] == "contract_violation"
    assert "director" in failed["payload"]["message"]
    assert fake.calls == 1  # no retry: Director fails back to the user


@needs_tsx
def test_narrator_scene_mismatch_falls_back_to_choreographer(store):
    bad_narration = dict(NARRATION, scenes=NARRATION["scenes"][:4] + [NARRATION["scenes"][0]])
    bad_narration["scenes"] = NARRATION["scenes"][:4]  # 4 scenes for 5
    fake = FakeModel(
        [
            model_response(j(STORYBOARD)),
            model_response(j(SET_DESIGN)),
            model_response(j(CHOREO)),
            model_response(j(bad_narration)),
            model_response(j(CHOREO)),      # choreographer re-run (once)
            model_response(j(NARRATION)),
            model_response(j(ALL_PASS)),
        ]
    )
    crew = make_crew(store, fake)
    lesson = store.create_lesson("fp-narr", "t", "a", "en")
    crew.run(lesson.id)
    assert store.get_lesson(lesson.id).status == "ready"


def test_budget_exceeded_is_typed(store):
    # set fails -> director+set rerun (4 calls), choreo fails -> set rerun (6
    # calls at cap), choreographer retry would be call 7 -> budget_exceeded.
    fake = FakeModel(
        [
            model_response(j(STORYBOARD)),
            model_response("junk"),
            model_response(j(STORYBOARD)),
            model_response(j(SET_DESIGN)),
            model_response("junk"),
            model_response(j(SET_DESIGN)),
        ]
    )
    crew = make_crew(store, fake)
    lesson = store.create_lesson("fp-budget", "t", "a", "en")
    crew.run(lesson.id)
    failed = [e for e in store.list_events(lesson.id) if e["kind"] == "failed"][0]
    assert failed["payload"]["error_code"] == "budget_exceeded"


@needs_tsx
def test_inspector_loop_repairs_then_ships(store):
    fake = FakeModel(
        [
            *happy_sequence()[:4],
            model_response(j(verdicts_with_failure("off_camera"))),  # inspection 0
            model_response(j(CHOREO)),      # choreographer fix (loop 1)
            model_response(j(NARRATION)),   # narrator refresh (loop 1)
            model_response(j(ALL_PASS)),    # re-inspection passes
        ]
    )
    crew = make_crew(store, fake)
    lesson = store.create_lesson("fp-loop", "t", "a", "en")
    crew.run(lesson.id)
    assert store.get_lesson(lesson.id).status == "ready"
    inspections = [e for e in store.list_events(lesson.id) if e["kind"] == "inspection"]
    assert [i["payload"]["loop"] for i in inspections] == [0, 1]
    assert inspections[0]["payload"]["pass_rate"] == 0.8
    ready = [e for e in store.list_events(lesson.id) if e["kind"] == "ready"][0]
    assert ready["payload"]["inspector_loops"] == 1
    # The fix hints reached the choreographer.
    fix_call = fake.seen[5]
    assert "fix scene 1 (off_camera)" in fix_call["system"]


@needs_tsx
def test_single_cosmetic_failure_after_final_loop_is_acceptable(store):
    fake = FakeModel(
        [
            *happy_sequence()[:4],
            model_response(j(verdicts_with_failure("overlap"))),   # loop 0
            model_response(j(CHOREO)),
            model_response(j(NARRATION)),
            model_response(j(verdicts_with_failure("overlap"))),   # loop 1
            model_response(j(CHOREO)),
            model_response(j(NARRATION)),
            model_response(j(verdicts_with_failure("overlap"))),   # loop 2 (final)
        ]
    )
    crew = make_crew(store, fake)
    lesson = store.create_lesson("fp-cosmetic", "t", "a", "en")
    crew.run(lesson.id)
    assert store.get_lesson(lesson.id).status == "ready"  # <=1 cosmetic allowed


@needs_tsx
def test_persistent_content_wrong_fails_generation(store):
    fake = FakeModel(
        [
            *happy_sequence()[:4],
            model_response(j(verdicts_with_failure("content_wrong"))),
            model_response(j(CHOREO)),
            model_response(j(NARRATION)),
            model_response(j(verdicts_with_failure("content_wrong"))),
            model_response(j(CHOREO)),
            model_response(j(NARRATION)),
            model_response(j(verdicts_with_failure("content_wrong"))),
        ]
    )
    crew = make_crew(store, fake)
    lesson = store.create_lesson("fp-wrong", "t", "a", "en")
    crew.run(lesson.id)
    refreshed = store.get_lesson(lesson.id)
    assert refreshed.status == "failed"
    assert refreshed.current_script is None  # a wrong lesson is never shipped
    failed = [e for e in store.list_events(lesson.id) if e["kind"] == "failed"][0]
    assert failed["payload"]["error_code"] == "inspection_failed"


def test_pipeline_flag_selects_crew(monkeypatch, tmp_path):
    monkeypatch.setenv("PIPELINE", "crew")
    monkeypatch.setenv("SINAA_DB_PATH", str(tmp_path / "flag.db"))
    from app.main import build_pipeline, build_store
    from app.settings import Settings

    settings = Settings()
    assert settings.pipeline == "crew"
    pipeline = build_pipeline(settings, build_store(settings))
    assert isinstance(pipeline, CrewPipeline)
    assert pipeline.prompt_version.startswith("crew@")


def test_crew_fingerprint_differs_from_single(store):
    fake = FakeModel([])
    crew = make_crew(store, fake)
    from tests.conftest import make_pipeline

    single = make_pipeline(store, fake)
    assert crew.fingerprint("t", "a", "en") != single.fingerprint("t", "a", "en")
