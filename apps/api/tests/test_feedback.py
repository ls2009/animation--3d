from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import FakeModel, make_pipeline


def make_client(store) -> TestClient:
    return TestClient(create_app(store=store, pipeline=make_pipeline(store, FakeModel([]))))


def test_feedback_roundtrip_and_grouping(store):
    lesson = store.create_lesson("fp-fb", "turbo", "teens", "en")
    client = make_client(store)

    assert client.post(
        f"/lessons/{lesson.id}/feedback",
        json={"verdict": "broken", "scene_index": 2, "note": "prop floats"},
    ).status_code == 201
    assert client.post(
        f"/lessons/{lesson.id}/feedback", json={"verdict": "confusing", "scene_index": 0}
    ).status_code == 201
    assert client.post(
        f"/lessons/{lesson.id}/feedback", json={"verdict": "good"}
    ).status_code == 201

    backlog = client.get("/feedback").json()
    assert len(backlog["engine_backlog"]) == 1
    assert backlog["engine_backlog"][0]["note"] == "prop floats"
    assert backlog["engine_backlog"][0]["topic"] == "turbo"
    assert len(backlog["prompt_backlog"]) == 1
    assert len(backlog["good"]) == 1

    # Feedback is also an event in the append-only ledger.
    kinds = [e["kind"] for e in store.list_events(lesson.id)]
    assert kinds.count("feedback") == 3


def test_feedback_validation(store):
    lesson = store.create_lesson("fp-fb2", "t", "a", "en")
    client = make_client(store)
    assert client.post(
        f"/lessons/{lesson.id}/feedback", json={"verdict": "meh"}
    ).status_code == 422
    assert client.post(
        "/lessons/nope/feedback", json={"verdict": "good"}
    ).status_code == 404


def test_lessons_list_only_ready(store):
    ready = store.create_lesson("fp-r", "ready topic", "kids", "en")
    store.save_script(ready.id, {"version": "1.0", "title": "Ready!"}, "1.0")
    store.set_status(ready.id, "ready")
    store.create_lesson("fp-q", "queued topic", "kids", "en")

    client = make_client(store)
    lessons = client.get("/lessons").json()["lessons"]
    assert len(lessons) == 1
    assert lessons[0]["title"] == "Ready!"
    assert lessons[0]["topic"] == "ready topic"
