import json

import pytest

from tests.conftest import (
    SAMPLE_SCRIPT,
    TSX_AVAILABLE,
    FakeModel,
    make_pipeline,
    model_response,
)

needs_tsx = pytest.mark.skipif(
    not TSX_AVAILABLE, reason="validator bridge needs tsx (run pnpm install)"
)


@needs_tsx
def test_happy_path_logs_repairs_and_sets_ready(store, good_model):
    pipe = make_pipeline(store, good_model)
    lesson = store.create_lesson(
        pipe.fingerprint("t", "a", "en"), "t", "a", "en"
    )
    pipe.run(lesson.id)

    refreshed = store.get_lesson(lesson.id)
    assert refreshed.status == "ready"
    assert refreshed.current_script["title"] == "Test lesson"
    # The unknown prop was repaired to block, not dropped.
    assert refreshed.current_script["actors"][1]["prop"] == "block"

    events = store.list_events(lesson.id)
    kinds = [e["kind"] for e in events]
    assert kinds == ["generation_started", "agent_call", "validator_repairs", "ready"]

    agent_call = events[1]
    assert agent_call["model"] == "claude-opus-5-5"
    assert agent_call["input_tokens"] == 1000
    assert agent_call["payload"]["cost_usd"] == pytest.approx(0.044)

    repairs = events[2]["payload"]
    assert repairs["repair_count"] == 1
    assert repairs["by_code"] == {"unknown_prop": 1}
    assert good_model.calls == 1


@needs_tsx
def test_markdown_fenced_json_is_tolerated(store):
    fenced = "```json\n" + json.dumps(SAMPLE_SCRIPT) + "\n```"
    pipe = make_pipeline(store, FakeModel([model_response(fenced)]))
    lesson = store.create_lesson("fp-fenced", "t", "a", "en")
    pipe.run(lesson.id)
    assert store.get_lesson(lesson.id).status == "ready"


def test_budget_exceeded_is_typed_never_retried(store):
    fake = FakeModel([model_response("{\"truncated\": tru", stop_reason="max_tokens")])
    pipe = make_pipeline(store, fake)
    lesson = store.create_lesson("fp-budget", "t", "a", "en")
    pipe.run(lesson.id)

    assert store.get_lesson(lesson.id).status == "failed"
    failed = [e for e in store.list_events(lesson.id) if e["kind"] == "failed"][0]
    assert failed["payload"]["error_code"] == "budget_exceeded"
    assert fake.calls == 1  # no silent retry


def test_bad_model_json_fails_typed(store):
    pipe = make_pipeline(store, FakeModel([model_response("I cannot do JSON today.")]))
    lesson = store.create_lesson("fp-badjson", "t", "a", "en")
    pipe.run(lesson.id)
    failed = [e for e in store.list_events(lesson.id) if e["kind"] == "failed"][0]
    assert failed["payload"]["error_code"] == "bad_model_json"


@needs_tsx
def test_unrepairable_script_fails_typed(store):
    pipe = make_pipeline(
        store, FakeModel([model_response(json.dumps({"scenes": [], "title": "x"}))])
    )
    lesson = store.create_lesson("fp-noscenes", "t", "a", "en")
    pipe.run(lesson.id)
    failed = [e for e in store.list_events(lesson.id) if e["kind"] == "failed"][0]
    assert failed["payload"]["error_code"] == "unrepairable_script"


def test_fingerprint_inputs(store, good_model):
    pipe = make_pipeline(store, good_model)
    fp1 = pipe.fingerprint("Topic", "kids", "en")
    assert pipe.fingerprint("  topic ", "KIDS", "EN") == fp1
    assert pipe.fingerprint("Topic", "kids", "fr") != fp1
