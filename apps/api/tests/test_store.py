import pytest

from pipeline.store import SqliteStore


def test_lesson_roundtrip(store: SqliteStore):
    lesson = store.create_lesson("fp1", "topic", "kids", "en")
    assert lesson.status == "queued"
    assert store.get_lesson(lesson.id).topic == "topic"
    assert store.get_lesson_by_fingerprint("fp1").id == lesson.id
    assert store.get_lesson_by_fingerprint("nope") is None

    store.set_status(lesson.id, "ready")
    assert store.get_lesson(lesson.id).status == "ready"
    with pytest.raises(ValueError):
        store.set_status(lesson.id, "exploded")

    store.save_script(lesson.id, {"version": "1.0"}, "1.0")
    assert store.get_lesson(lesson.id).current_script == {"version": "1.0"}
    assert store.get_lesson(lesson.id).script_version == "1.0"


def test_events_are_sequenced_per_lesson(store: SqliteStore):
    a = store.create_lesson("fpa", "t", "a", "en")
    b = store.create_lesson("fpb", "t", "a", "fr")
    assert store.save_event(a.id, "generation_started") == 1
    assert store.save_event(a.id, "agent_call", role="single_pass", model="m",
                            input_tokens=10, output_tokens=20, latency_ms=5,
                            payload={"x": 1}) == 2
    assert store.save_event(b.id, "generation_started") == 1

    events = store.list_events(a.id)
    assert [e["seq"] for e in events] == [1, 2]
    assert events[1]["payload"] == {"x": 1}
    assert events[1]["input_tokens"] == 10

    with pytest.raises(ValueError):
        store.save_event(a.id, "weird_kind")
