# apps/api — Sinaa Motion Lab API

FastAPI service (Python 3.12) that runs the agent crew, budgets, caching by
fingerprint, headless keyframe rendering and the event ledger. All model calls
happen here; the browser never sees the Anthropic key.

## Run

```bash
uv sync
uv run uvicorn app.main:app --reload
```

Then: `curl http://localhost:8000/health`

## Test and lint

```bash
uv run pytest
uv run ruff check .
```

Configuration is read from the environment (see the repo root `.env.example`).
