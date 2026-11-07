import json

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
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

REQUEST = {"topic": "how dns works", "audience": "curious teens", "language": "en"}


def make_client(store, fake: FakeModel) -> TestClient:
    app = create_app(store=store, pipeline=make_pipeline(store, fake))
    return TestClient(app)


@needs_tsx
def test_post_then_poll_until_ready(store):
    fake = FakeModel([model_response(json.dumps(SAMPLE_SCRIPT))])
    client = make_client(store, fake)

    created = client.post("/lessons", json=REQUEST)
    assert created.status_code == 202
    lesson_id = created.json()["id"]
    assert created.json()["cached"] is False

    # TestClient runs background tasks before returning, so the terminal
    # state is already visible to the next poll.
    polled = client.get(f"/lessons/{lesson_id}").json()
    assert polled["status"] == "ready"
    assert polled["script"]["title"] == "Test lesson"

    events = client.get(f"/lessons/{lesson_id}/events").json()["events"]
    assert [e["kind"] for e in events] == [
        "generation_started", "agent_call", "validator_repairs", "ready",
    ]


@needs_tsx
def test_fingerprint_cache_means_no_second_model_call(store):
    fake = FakeModel([model_response(json.dumps(SAMPLE_SCRIPT))])
    client = make_client(store, fake)

    first = client.post("/lessons", json=REQUEST).json()
    second = client.post("/lessons", json=REQUEST).json()
    assert second["id"] == first["id"]
    assert second["cached"] is True
    assert fake.calls == 1  # cache hit: no model call

    # Normalization folds into the same fingerprint.
    third = client.post(
        "/lessons",
        json={"topic": "  How   DNS works ", "audience": "CURIOUS TEENS", "language": "EN"},
    ).json()
    assert third["id"] == first["id"]
    assert fake.calls == 1


def test_failed_generation_surfaces_typed_error(store):
    fake = FakeModel([model_response("not json at all")])
    client = make_client(store, fake)
    lesson_id = client.post("/lessons", json=REQUEST).json()["id"]

    polled = client.get(f"/lessons/{lesson_id}").json()
    assert polled["status"] == "failed"
    assert polled["error"]["error_code"] == "bad_model_json"


@needs_tsx
def test_failed_lesson_requeues_on_repost(store):
    fake = FakeModel(
        [
            model_response("broken"),
            model_response(json.dumps(SAMPLE_SCRIPT)),
        ]
    )
    client = make_client(store, fake)
    first = client.post("/lessons", json=REQUEST).json()
    assert client.get(f"/lessons/{first['id']}").json()["status"] == "failed"

    retried = client.post("/lessons", json=REQUEST).json()
    assert retried["id"] == first["id"]
    assert client.get(f"/lessons/{first['id']}").json()["status"] == "ready"
    assert fake.calls == 2


def test_unknown_lesson_404s(store):
    client = make_client(store, FakeModel([]))
    assert client.get("/lessons/does-not-exist").status_code == 404
    assert client.get("/lessons/does-not-exist/events").status_code == 404


def test_request_validation(store):
    client = make_client(store, FakeModel([]))
    bad = {"topic": "x", "audience": "", "language": ""}
    assert client.post("/lessons", json=bad).status_code == 422
