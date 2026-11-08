"""Thin store interface + two implementations.

The pipeline depends ONLY on this interface (plus the Anthropic SDK and the
DSL schema), so Course AI can implement it against its own tables and the
crew code moves unchanged.

- SupabaseStore: the production store (service role; RLS bypassed server-side).
- SqliteStore: local fallback used until Supabase credentials exist, and in
  tests. Same event-sourced discipline: lesson_events is append-only.
"""

from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

STATUSES = (
    "queued",
    "directing",
    "designing",
    "choreographing",
    "inspecting",
    "ready",
    "failed",
)

EVENT_KINDS = (
    "generation_started",
    "agent_call",
    "validator_repairs",
    "inspection",
    "ready",
    "failed",
    "feedback",
)


@dataclass
class Lesson:
    id: str
    fingerprint: str
    topic: str
    audience: str
    language: str
    status: str
    script_version: str | None
    current_script: dict[str, Any] | None
    created_at: str


class Store(Protocol):
    def create_lesson(
        self, fingerprint: str, topic: str, audience: str, language: str
    ) -> Lesson: ...

    def get_lesson(self, lesson_id: str) -> Lesson | None: ...

    def get_lesson_by_fingerprint(self, fingerprint: str) -> Lesson | None: ...

    def set_status(self, lesson_id: str, status: str) -> None: ...

    def save_script(self, lesson_id: str, script: dict[str, Any], version: str) -> None: ...

    def save_event(
        self,
        lesson_id: str,
        kind: str,
        *,
        role: str | None = None,
        prompt_version: str | None = None,
        model: str | None = None,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        latency_ms: int | None = None,
        payload: dict[str, Any] | None = None,
    ) -> int: ...

    def list_events(self, lesson_id: str) -> list[dict[str, Any]]: ...

    # -- golden runs ----------------------------------------------------------
    def create_golden_run(self, git_sha: str, prompt_versions: dict[str, str]) -> str: ...

    def finish_golden_run(self, run_id: str, summary: dict[str, Any]) -> None: ...

    def save_golden_result(self, run_id: str, result: dict[str, Any]) -> None: ...

    def list_golden_runs(self, limit: int = 5) -> list[dict[str, Any]]: ...

    def list_golden_results(self, run_id: str) -> list[dict[str, Any]]: ...

    def previous_golden_run(self, before_run_id: str) -> dict[str, Any] | None: ...

    # -- storyboards (exemplar store) ----------------------------------------
    def save_storyboard(
        self,
        lesson_id: str,
        storyboard: dict[str, Any],
        passed: bool,
        embedding: list[float] | None,
    ) -> None: ...

    def nearest_storyboards(self, embedding: list[float], k: int = 3) -> list[dict[str, Any]]: ...

    # -- prop requests ---------------------------------------------------------
    def upsert_prop_request(self, name: str, nearest_existing: str, lesson_id: str) -> int: ...

    def list_prop_requests(self) -> list[dict[str, Any]]: ...

    # -- feedback ---------------------------------------------------------------
    def save_feedback(
        self,
        lesson_id: str,
        verdict: str,
        scene_index: int | None,
        note: str | None,
        viewer_id: str | None = None,
    ) -> None: ...

    def list_feedback(self, limit: int = 200) -> list[dict[str, Any]]: ...

    # -- lesson listing -----------------------------------------------------------
    def list_lessons(self, status: str | None = "ready", limit: int = 20) -> list[Lesson]: ...


def _now() -> str:
    return datetime.now(UTC).isoformat()


class SqliteStore:
    """File-backed store; schema mirrors db/migrations/0001_init.sql loosely."""

    def __init__(self, path: str | Path):
        self._path = str(path)
        self._lock = threading.Lock()
        with self._conn() as conn:
            conn.executescript(
                """
                create table if not exists lessons (
                  id text primary key,
                  fingerprint text not null unique,
                  topic text not null,
                  audience text not null,
                  language text not null,
                  status text not null,
                  script_version text,
                  current_script text,
                  created_at text not null
                );
                create table if not exists lesson_events (
                  id text primary key,
                  lesson_id text not null,
                  seq integer not null,
                  kind text not null,
                  role text,
                  prompt_version text,
                  model text,
                  input_tokens integer,
                  output_tokens integer,
                  latency_ms integer,
                  payload text,
                  created_at text not null,
                  unique (lesson_id, seq)
                );
                create table if not exists feedback (
                  id text primary key,
                  lesson_id text not null,
                  viewer_id text,
                  verdict text not null,
                  scene_index integer,
                  note text,
                  created_at text not null
                );
                create table if not exists storyboards (
                  id text primary key,
                  lesson_id text not null,
                  embedding text,
                  passed integer not null default 0,
                  storyboard text not null,
                  created_at text not null
                );
                create table if not exists prop_requests (
                  name text primary key,
                  count integer not null default 1,
                  nearest_existing text,
                  last_lesson_id text,
                  created_at text not null
                );
                create table if not exists golden_runs (
                  id text primary key,
                  git_sha text not null,
                  prompt_versions text,
                  started_at text not null,
                  summary text,
                  created_at text not null
                );
                create table if not exists golden_results (
                  id text primary key,
                  run_id text not null,
                  topic_id text not null,
                  lesson_id text,
                  status text not null,
                  repairs integer,
                  inspector_pass_rate real,
                  runtime_s real,
                  cost_usd real,
                  script text,
                  created_at text not null
                );
                """
            )

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        return conn

    @staticmethod
    def _row_to_lesson(row: sqlite3.Row) -> Lesson:
        return Lesson(
            id=row["id"],
            fingerprint=row["fingerprint"],
            topic=row["topic"],
            audience=row["audience"],
            language=row["language"],
            status=row["status"],
            script_version=row["script_version"],
            current_script=json.loads(row["current_script"]) if row["current_script"] else None,
            created_at=row["created_at"],
        )

    def create_lesson(self, fingerprint: str, topic: str, audience: str, language: str) -> Lesson:
        lesson = Lesson(
            id=str(uuid.uuid4()),
            fingerprint=fingerprint,
            topic=topic,
            audience=audience,
            language=language,
            status="queued",
            script_version=None,
            current_script=None,
            created_at=_now(),
        )
        with self._lock, self._conn() as conn:
            conn.execute(
                "insert into lessons"
                " (id, fingerprint, topic, audience, language, status, created_at)"
                " values (?,?,?,?,?,?,?)",
                (lesson.id, fingerprint, topic, audience, language,
                 lesson.status, lesson.created_at),
            )
        return lesson

    def get_lesson(self, lesson_id: str) -> Lesson | None:
        with self._conn() as conn:
            row = conn.execute("select * from lessons where id=?", (lesson_id,)).fetchone()
        return self._row_to_lesson(row) if row else None

    def get_lesson_by_fingerprint(self, fingerprint: str) -> Lesson | None:
        with self._conn() as conn:
            row = conn.execute(
                "select * from lessons where fingerprint=?", (fingerprint,)
            ).fetchone()
        return self._row_to_lesson(row) if row else None

    def set_status(self, lesson_id: str, status: str) -> None:
        if status not in STATUSES:
            raise ValueError(f"unknown status {status}")
        with self._lock, self._conn() as conn:
            conn.execute("update lessons set status=? where id=?", (status, lesson_id))

    def save_script(self, lesson_id: str, script: dict[str, Any], version: str) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                "update lessons set current_script=?, script_version=? where id=?",
                (json.dumps(script), version, lesson_id),
            )

    def save_event(
        self,
        lesson_id: str,
        kind: str,
        *,
        role: str | None = None,
        prompt_version: str | None = None,
        model: str | None = None,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        latency_ms: int | None = None,
        payload: dict[str, Any] | None = None,
    ) -> int:
        if kind not in EVENT_KINDS:
            raise ValueError(f"unknown event kind {kind}")
        with self._lock, self._conn() as conn:
            row = conn.execute(
                "select coalesce(max(seq), 0) + 1 as seq from lesson_events where lesson_id=?",
                (lesson_id,),
            ).fetchone()
            seq = int(row["seq"])
            conn.execute(
                "insert into lesson_events (id, lesson_id, seq, kind, role, prompt_version, model,"
                " input_tokens, output_tokens, latency_ms, payload, created_at)"
                " values (?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    str(uuid.uuid4()),
                    lesson_id,
                    seq,
                    kind,
                    role,
                    prompt_version,
                    model,
                    input_tokens,
                    output_tokens,
                    latency_ms,
                    json.dumps(payload) if payload is not None else None,
                    _now(),
                ),
            )
        return seq

    def list_events(self, lesson_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "select * from lesson_events where lesson_id=? order by seq", (lesson_id,)
            ).fetchall()
        out: list[dict[str, Any]] = []
        for row in rows:
            event = dict(row)
            event["payload"] = json.loads(event["payload"]) if event["payload"] else None
            out.append(event)
        return out


    # -- golden runs ----------------------------------------------------------
    def create_golden_run(self, git_sha: str, prompt_versions: dict[str, Any]) -> str:
        run_id = str(uuid.uuid4())
        with self._lock, self._conn() as conn:
            conn.execute(
                "insert into golden_runs (id, git_sha, prompt_versions, started_at, created_at)"
                " values (?,?,?,?,?)",
                (run_id, git_sha, json.dumps(prompt_versions), _now(), _now()),
            )
        return run_id

    def finish_golden_run(self, run_id: str, summary: dict[str, Any]) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                "update golden_runs set summary=? where id=?",
                (json.dumps(summary), run_id),
            )

    def save_golden_result(self, run_id: str, result: dict[str, Any]) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                "insert into golden_results (id, run_id, topic_id, lesson_id, status, repairs,"
                " inspector_pass_rate, runtime_s, cost_usd, script, created_at)"
                " values (?,?,?,?,?,?,?,?,?,?,?)",
                (
                    str(uuid.uuid4()),
                    run_id,
                    result["topic_id"],
                    result.get("lesson_id"),
                    result["status"],
                    result.get("repairs"),
                    result.get("inspector_pass_rate"),
                    result.get("runtime_s"),
                    result.get("cost_usd"),
                    json.dumps(result.get("script")) if result.get("script") else None,
                    _now(),
                ),
            )

    def list_golden_runs(self, limit: int = 5) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "select * from golden_runs order by started_at desc limit ?", (limit,)
            ).fetchall()
        out = []
        for row in rows:
            run = dict(row)
            run["prompt_versions"] = (
                json.loads(run["prompt_versions"]) if run["prompt_versions"] else None
            )
            run["summary"] = json.loads(run["summary"]) if run["summary"] else None
            out.append(run)
        return out

    def list_golden_results(self, run_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "select * from golden_results where run_id=? order by topic_id", (run_id,)
            ).fetchall()
        out = []
        for row in rows:
            result = dict(row)
            result["script"] = json.loads(result["script"]) if result["script"] else None
            out.append(result)
        return out

    def previous_golden_run(self, before_run_id: str) -> dict[str, Any] | None:
        runs = self.list_golden_runs(limit=50)
        for run in runs:
            if run["id"] != before_run_id and run["summary"] is not None:
                return run
        return None



    # -- storyboards (exemplar store) ----------------------------------------
    def save_storyboard(
        self,
        lesson_id: str,
        storyboard: dict[str, Any],
        passed: bool,
        embedding: list[float] | None,
    ) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                "insert into storyboards (id, lesson_id, embedding, passed, storyboard,"
                " created_at) values (?,?,?,?,?,?)",
                (
                    str(uuid.uuid4()),
                    lesson_id,
                    json.dumps(embedding) if embedding is not None else None,
                    1 if passed else 0,
                    json.dumps(storyboard),
                    _now(),
                ),
            )

    def nearest_storyboards(self, embedding: list[float], k: int = 3) -> list[dict[str, Any]]:
        from .embeddings import cosine

        with self._conn() as conn:
            rows = conn.execute(
                "select storyboard, embedding from storyboards"
                " where passed=1 and embedding is not null"
            ).fetchall()
        scored = []
        for row in rows:
            emb = json.loads(row["embedding"])
            scored.append((cosine(embedding, emb), json.loads(row["storyboard"])))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [sb for _, sb in scored[:k]]

    # -- prop requests ---------------------------------------------------------
    def upsert_prop_request(self, name: str, nearest_existing: str, lesson_id: str) -> int:
        with self._lock, self._conn() as conn:
            conn.execute(
                "insert into prop_requests (name, count, nearest_existing, last_lesson_id,"
                " created_at) values (?,1,?,?,?)"
                " on conflict(name) do update set count=count+1,"
                " nearest_existing=excluded.nearest_existing,"
                " last_lesson_id=excluded.last_lesson_id",
                (name, nearest_existing, lesson_id, _now()),
            )
            row = conn.execute(
                "select count from prop_requests where name=?", (name,)
            ).fetchone()
        return int(row["count"])

    def list_prop_requests(self) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "select * from prop_requests order by count desc, name"
            ).fetchall()
        return [dict(row) for row in rows]



    # -- feedback ---------------------------------------------------------------
    FEEDBACK_VERDICTS = ("good", "wrong", "confusing", "boring", "broken")

    def save_feedback(
        self,
        lesson_id: str,
        verdict: str,
        scene_index: int | None,
        note: str | None,
        viewer_id: str | None = None,
    ) -> None:
        if verdict not in self.FEEDBACK_VERDICTS:
            raise ValueError(f"unknown verdict {verdict}")
        with self._lock, self._conn() as conn:
            conn.execute(
                "insert into feedback (id, lesson_id, viewer_id, verdict, scene_index, note,"
                " created_at) values (?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), lesson_id, viewer_id, verdict, scene_index, note, _now()),
            )

    def list_feedback(self, limit: int = 200) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "select f.*, l.topic from feedback f left join lessons l on l.id = f.lesson_id"
                " order by f.created_at desc limit ?",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    # -- lesson listing -----------------------------------------------------------
    def list_lessons(self, status: str | None = "ready", limit: int = 20) -> list[Lesson]:
        with self._conn() as conn:
            if status is None:
                rows = conn.execute(
                    "select * from lessons order by created_at desc limit ?", (limit,)
                ).fetchall()
            else:
                rows = conn.execute(
                    "select * from lessons where status=? order by created_at desc limit ?",
                    (status, limit),
                ).fetchall()
        return [self._row_to_lesson(row) for row in rows]


class SupabaseStore:
    """Supabase-backed store (service role key; used once credentials exist)."""

    def __init__(self, url: str, service_role_key: str):
        from supabase import create_client

        self._client = create_client(url, service_role_key)

    @staticmethod
    def _row_to_lesson(row: dict[str, Any]) -> Lesson:
        return Lesson(
            id=row["id"],
            fingerprint=row["fingerprint"],
            topic=row["topic"],
            audience=row["audience"],
            language=row["language"],
            status=row["status"],
            script_version=row.get("script_version"),
            current_script=row.get("current_script"),
            created_at=row.get("created_at", ""),
        )

    def create_lesson(self, fingerprint: str, topic: str, audience: str, language: str) -> Lesson:
        result = (
            self._client.table("lessons")
            .insert(
                {
                    "fingerprint": fingerprint,
                    "topic": topic,
                    "audience": audience,
                    "language": language,
                    "status": "queued",
                }
            )
            .execute()
        )
        return self._row_to_lesson(result.data[0])

    def get_lesson(self, lesson_id: str) -> Lesson | None:
        result = self._client.table("lessons").select("*").eq("id", lesson_id).execute()
        return self._row_to_lesson(result.data[0]) if result.data else None

    def get_lesson_by_fingerprint(self, fingerprint: str) -> Lesson | None:
        result = (
            self._client.table("lessons").select("*").eq("fingerprint", fingerprint).execute()
        )
        return self._row_to_lesson(result.data[0]) if result.data else None

    def set_status(self, lesson_id: str, status: str) -> None:
        if status not in STATUSES:
            raise ValueError(f"unknown status {status}")
        self._client.table("lessons").update({"status": status}).eq("id", lesson_id).execute()

    def save_script(self, lesson_id: str, script: dict[str, Any], version: str) -> None:
        self._client.table("lessons").update(
            {"current_script": script, "script_version": version}
        ).eq("id", lesson_id).execute()

    def save_event(
        self,
        lesson_id: str,
        kind: str,
        *,
        role: str | None = None,
        prompt_version: str | None = None,
        model: str | None = None,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        latency_ms: int | None = None,
        payload: dict[str, Any] | None = None,
    ) -> int:
        if kind not in EVENT_KINDS:
            raise ValueError(f"unknown event kind {kind}")
        existing = (
            self._client.table("lesson_events")
            .select("seq")
            .eq("lesson_id", lesson_id)
            .order("seq", desc=True)
            .limit(1)
            .execute()
        )
        seq = (existing.data[0]["seq"] + 1) if existing.data else 1
        self._client.table("lesson_events").insert(
            {
                "lesson_id": lesson_id,
                "seq": seq,
                "kind": kind,
                "role": role,
                "prompt_version": prompt_version,
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "latency_ms": latency_ms,
                "payload": payload,
            }
        ).execute()
        return seq

    def list_events(self, lesson_id: str) -> list[dict[str, Any]]:
        result = (
            self._client.table("lesson_events")
            .select("*")
            .eq("lesson_id", lesson_id)
            .order("seq")
            .execute()
        )
        return list(result.data)

    # -- golden runs ----------------------------------------------------------
    def create_golden_run(self, git_sha: str, prompt_versions: dict[str, Any]) -> str:
        result = (
            self._client.table("golden_runs")
            .insert({"git_sha": git_sha, "prompt_versions": prompt_versions})
            .execute()
        )
        return result.data[0]["id"]

    def finish_golden_run(self, run_id: str, summary: dict[str, Any]) -> None:
        self._client.table("golden_runs").update({"summary": summary}).eq("id", run_id).execute()

    def save_golden_result(self, run_id: str, result: dict[str, Any]) -> None:
        self._client.table("golden_results").insert(
            {
                "run_id": run_id,
                "topic_id": result["topic_id"],
                "lesson_id": result.get("lesson_id"),
                "status": result["status"],
                "repairs": result.get("repairs"),
                "inspector_pass_rate": result.get("inspector_pass_rate"),
                "runtime_s": result.get("runtime_s"),
                "cost_usd": result.get("cost_usd"),
                "script": result.get("script"),
            }
        ).execute()

    def list_golden_runs(self, limit: int = 5) -> list[dict[str, Any]]:
        result = (
            self._client.table("golden_runs")
            .select("*")
            .order("started_at", desc=True)
            .limit(limit)
            .execute()
        )
        return list(result.data)

    def list_golden_results(self, run_id: str) -> list[dict[str, Any]]:
        result = (
            self._client.table("golden_results")
            .select("*")
            .eq("run_id", run_id)
            .order("topic_id")
            .execute()
        )
        return list(result.data)

    def previous_golden_run(self, before_run_id: str) -> dict[str, Any] | None:
        for run in self.list_golden_runs(limit=50):
            if run["id"] != before_run_id and run.get("summary") is not None:
                return run
        return None

    # -- storyboards (exemplar store) ----------------------------------------
    def save_storyboard(
        self,
        lesson_id: str,
        storyboard: dict[str, Any],
        passed: bool,
        embedding: list[float] | None,
    ) -> None:
        self._client.table("storyboards").insert(
            {
                "lesson_id": lesson_id,
                "embedding": embedding,
                "passed": passed,
                "storyboard": storyboard,
            }
        ).execute()

    def nearest_storyboards(self, embedding: list[float], k: int = 3) -> list[dict[str, Any]]:
        # Client-side cosine over recent passed storyboards; swap for a
        # pgvector RPC when scale demands it.
        from .embeddings import cosine

        result = (
            self._client.table("storyboards")
            .select("storyboard, embedding")
            .eq("passed", True)
            .not_.is_("embedding", "null")
            .limit(200)
            .execute()
        )
        scored = [
            (cosine(embedding, row["embedding"]), row["storyboard"]) for row in result.data
        ]
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [sb for _, sb in scored[:k]]

    # -- prop requests ---------------------------------------------------------
    def upsert_prop_request(self, name: str, nearest_existing: str, lesson_id: str) -> int:
        existing = (
            self._client.table("prop_requests").select("count").eq("name", name).execute()
        )
        if existing.data:
            count = existing.data[0]["count"] + 1
            self._client.table("prop_requests").update(
                {
                    "count": count,
                    "nearest_existing": nearest_existing,
                    "last_lesson_id": lesson_id,
                }
            ).eq("name", name).execute()
            return count
        self._client.table("prop_requests").insert(
            {
                "name": name,
                "count": 1,
                "nearest_existing": nearest_existing,
                "last_lesson_id": lesson_id,
            }
        ).execute()
        return 1

    def list_prop_requests(self) -> list[dict[str, Any]]:
        result = (
            self._client.table("prop_requests")
            .select("*")
            .order("count", desc=True)
            .execute()
        )
        return list(result.data)

    # -- feedback ---------------------------------------------------------------
    FEEDBACK_VERDICTS = ("good", "wrong", "confusing", "boring", "broken")

    def save_feedback(
        self,
        lesson_id: str,
        verdict: str,
        scene_index: int | None,
        note: str | None,
        viewer_id: str | None = None,
    ) -> None:
        if verdict not in self.FEEDBACK_VERDICTS:
            raise ValueError(f"unknown verdict {verdict}")
        self._client.table("feedback").insert(
            {
                "lesson_id": lesson_id,
                "viewer_id": viewer_id,
                "verdict": verdict,
                "scene_index": scene_index,
                "note": note,
            }
        ).execute()

    def list_feedback(self, limit: int = 200) -> list[dict[str, Any]]:
        result = (
            self._client.table("feedback")
            .select("*, lessons(topic)")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = []
        for row in result.data:
            flat = dict(row)
            lesson = flat.pop("lessons", None) or {}
            flat["topic"] = lesson.get("topic")
            rows.append(flat)
        return rows

    # -- lesson listing -----------------------------------------------------------
    def list_lessons(self, status: str | None = "ready", limit: int = 20) -> list[Lesson]:
        query = self._client.table("lessons").select("*")
        if status is not None:
            query = query.eq("status", status)
        result = query.order("created_at", desc=True).limit(limit).execute()
        return [self._row_to_lesson(row) for row in result.data]
