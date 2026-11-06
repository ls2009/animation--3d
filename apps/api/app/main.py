"""Sinaa Motion Lab API.

Phase 0: health check only. Phase 3 adds POST /lessons, the background
generation task and the polling endpoint; Phase 5 adds the agent crew.
All model calls happen here, server-side — the browser never sees secrets.
"""

from fastapi import FastAPI

app = FastAPI(title="Sinaa Motion Lab API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "sinaa-motion-lab-api"}
