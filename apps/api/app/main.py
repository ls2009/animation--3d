"""Sinaa Motion Lab API.

Phase 3: POST /lessons runs the single-pass pipeline as a background task
(generation never blocks the request); the web app polls GET /lessons/{id}
until status is ready|failed. Phase 5 adds the crew behind the same
endpoints.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pipeline.single_pass import SinglePassPipeline
from pipeline.store import SqliteStore, Store, SupabaseStore

from .settings import Settings


class LessonRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=200)
    audience: str = Field(min_length=2, max_length=120)
    language: str = Field(min_length=2, max_length=12)


def build_store(settings: Settings) -> Store:
    if settings.supabase_configured:
        return SupabaseStore(settings.supabase_url, settings.supabase_service_role_key)
    Path(settings.sqlite_path).parent.mkdir(parents=True, exist_ok=True)
    return SqliteStore(settings.sqlite_path)


def build_pipeline(settings: Settings, store: Store) -> SinglePassPipeline:
    from pipeline.model_client import AnthropicClient

    return SinglePassPipeline(
        store,
        AnthropicClient(),
        repo_root=settings.repo_root,
        prompt_path=settings.prompt_dir / "single-pass.md",
        schema_path=settings.schema_path,
        catalog_path=settings.catalog_path,
        model=settings.model_complex,
    )


def create_app(
    *,
    store: Store | None = None,
    pipeline: SinglePassPipeline | None = None,
) -> FastAPI:
    settings = Settings()
    app = FastAPI(title="Sinaa Motion Lab API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # tightened at deploy time (Phase 7)
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.store = store if store is not None else build_store(settings)
    app.state.pipeline = pipeline  # built lazily so tests never need a model

    def get_pipeline() -> SinglePassPipeline:
        if app.state.pipeline is None:
            app.state.pipeline = build_pipeline(settings, app.state.store)
        return app.state.pipeline

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "sinaa-motion-lab-api"}

    @app.post("/lessons", status_code=202)
    def create_lesson(request: LessonRequest, background: BackgroundTasks) -> dict:
        pipe = get_pipeline()
        store: Store = app.state.store
        fingerprint = pipe.fingerprint(request.topic, request.audience, request.language)

        existing = store.get_lesson_by_fingerprint(fingerprint)
        if existing is not None:
            if existing.status == "ready":
                # Fingerprint cache hit: same script, no model call.
                return {"id": existing.id, "status": existing.status, "cached": True}
            if existing.status != "failed":
                # Generation already in flight — don't start a second one.
                return {"id": existing.id, "status": existing.status, "cached": False}
            # Failed before: re-queue the same lesson row.
            store.set_status(existing.id, "queued")
            background.add_task(pipe.run, existing.id)
            return {"id": existing.id, "status": "queued", "cached": False}

        lesson = store.create_lesson(
            fingerprint, request.topic, request.audience, request.language
        )
        background.add_task(pipe.run, lesson.id)
        return {"id": lesson.id, "status": lesson.status, "cached": False}

    @app.get("/lessons/{lesson_id}")
    def get_lesson(lesson_id: str) -> dict:
        store: Store = app.state.store
        lesson = store.get_lesson(lesson_id)
        if lesson is None:
            raise HTTPException(status_code=404, detail="lesson not found")
        body: dict = {
            "id": lesson.id,
            "topic": lesson.topic,
            "audience": lesson.audience,
            "language": lesson.language,
            "status": lesson.status,
            "script_version": lesson.script_version,
        }
        if lesson.status == "ready":
            body["script"] = lesson.current_script
        if lesson.status == "failed":
            failures = [e for e in store.list_events(lesson_id) if e["kind"] == "failed"]
            if failures:
                body["error"] = failures[-1]["payload"]
        return body

    @app.get("/lessons/{lesson_id}/events")
    def get_lesson_events(lesson_id: str) -> dict:
        store: Store = app.state.store
        if store.get_lesson(lesson_id) is None:
            raise HTTPException(status_code=404, detail="lesson not found")
        return {"events": store.list_events(lesson_id)}

    return app


app = create_app()
