import json

import pytest

from pipeline.golden import compare, run_golden, summarize
from tests.conftest import (
    REPO_ROOT,
    SAMPLE_SCRIPT,
    TSX_AVAILABLE,
    FakeModel,
    make_pipeline,
    model_response,
)

needs_tsx = pytest.mark.skipif(
    not TSX_AVAILABLE, reason="validator bridge needs tsx (run pnpm install)"
)

TOPICS = [
    {"id": "a--kids", "subject": "a", "topic": "topic a", "audience": "kids", "language": "en"},
    {"id": "b--kids", "subject": "b", "topic": "topic b", "audience": "kids", "language": "fr"},
    {"id": "c--kids", "subject": "c", "topic": "topic c", "audience": "kids", "language": "ar"},
]


@needs_tsx
def test_run_golden_persists_run_and_results(store, capsys):
    fake = FakeModel(
        [
            model_response(json.dumps(SAMPLE_SCRIPT)),
            model_response("garbage"),
            model_response(json.dumps(SAMPLE_SCRIPT)),
        ]
    )
    pipe = make_pipeline(store, fake)
    run_id, summary, regressions = run_golden(
        pipe, store, TOPICS, repo_root=REPO_ROOT, workers=1
    )

    assert regressions == []  # first run: no previous, gate passes
    assert summary["topics"] == 3
    assert summary["success_rate"] == pytest.approx(2 / 3, abs=0.01)
    assert summary["mean_repairs"] == 1.0  # SAMPLE_SCRIPT carries one unknown_prop
    assert summary["inspector_first_pass_rate"] is None  # no Inspector until Phase 5
    assert summary["mean_cost_usd"] == pytest.approx(0.044, abs=0.001)

    runs = store.list_golden_runs()
    assert len(runs) == 1 and runs[0]["id"] == run_id
    assert runs[0]["summary"]["success_rate"] == summary["success_rate"]
    assert runs[0]["prompt_versions"] == {"single_pass": pipe.prompt_version}

    results = store.list_golden_results(run_id)
    assert len(results) == 3
    statuses = {r["topic_id"]: r["status"] for r in results}
    assert statuses["a--kids"] == "ready"
    assert statuses["b--kids"] == "failed"
    ready = next(r for r in results if r["topic_id"] == "a--kids")
    assert ready["script"]["title"] == "Test lesson"
    assert ready["lesson_id"]

    out = capsys.readouterr().out
    assert "a--kids" in out and "summary:" in out


@needs_tsx
def test_caching_off_regenerates_and_gate_compares_to_previous(store, capsys):
    # Run 1: all three succeed.
    fake1 = FakeModel([model_response(json.dumps(SAMPLE_SCRIPT))] * 3)
    pipe1 = make_pipeline(store, fake1)
    run_golden(pipe1, store, TOPICS, repo_root=REPO_ROOT, workers=1)
    assert fake1.calls == 3

    # Run 2, same topics: caching OFF means three NEW model calls; two fail,
    # which breaches the -5pt success threshold vs run 1.
    fake2 = FakeModel(
        [
            model_response(json.dumps(SAMPLE_SCRIPT)),
            model_response("junk"),
            model_response("junk"),
        ]
    )
    pipe2 = make_pipeline(store, fake2)
    _, summary2, regressions = run_golden(pipe2, store, TOPICS, repo_root=REPO_ROOT, workers=1)
    assert fake2.calls == 3  # regenerated despite existing ready lessons
    assert summary2["success_rate"] == pytest.approx(1 / 3, abs=0.01)
    assert any("success_rate" in r for r in regressions)
    assert capsys.readouterr().out.count("REGRESSION GATE FAILED") == 1


def test_compare_thresholds():
    base = {
        "success_rate": 0.9,
        "mean_repairs": 2.0,
        "inspector_first_pass_rate": 0.8,
        "mean_cost_usd": 0.2,
        "p50_runtime_s": 50.0,
    }
    assert compare(dict(base), None) == []
    assert compare(dict(base), dict(base)) == []
    # Within thresholds.
    ok = dict(base, success_rate=0.86, mean_repairs=2.9, mean_cost_usd=0.24, p50_runtime_s=64.0)
    assert compare(ok, dict(base)) == []
    # Each metric breaching individually.
    assert any("success_rate" in r for r in compare(dict(base, success_rate=0.84), dict(base)))
    assert any("mean_repairs" in r for r in compare(dict(base, mean_repairs=3.1), dict(base)))
    assert any(
        "inspector" in r
        for r in compare(dict(base, inspector_first_pass_rate=0.69), dict(base))
    )
    assert any("cost" in r for r in compare(dict(base, mean_cost_usd=0.26), dict(base)))
    assert any("runtime" in r for r in compare(dict(base, p50_runtime_s=66.0), dict(base)))
    # Inspector None on either side: threshold skipped.
    assert compare(dict(base, inspector_first_pass_rate=None), dict(base)) == []


def test_summarize_empty_and_mixed():
    assert summarize([])["success_rate"] == 0.0
    from pipeline.golden import TopicResult

    results = [
        TopicResult("t1", "l1", "ready", 2, None, 10.0, 0.1, {"x": 1}),
        TopicResult("t2", "l2", "failed", None, None, 5.0, 0.1, None, error="boom"),
    ]
    s = summarize(results)
    assert s["success_rate"] == 0.5
    assert s["mean_repairs"] == 2
    assert s["p50_runtime_s"] == 7.5
