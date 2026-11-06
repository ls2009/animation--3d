# Sinaa Motion Lab

A test bench for generated 3D animated lessons: a person types any topic, an
audience and a language, and within about a minute watches a generated 3D
animated lesson they can orbit, scrub, listen to, and finish with a
three-question check.

A crew of agents writes a JSON **scene script**; a deterministic **Three.js
engine** plays it. Models produce JSON and text only — never geometry, pixels
or code that runs at playback. The same script renders identically on every
machine and offline.

## Layout

| Part               | Stack                          | Responsibility                                            |
| ------------------ | ------------------------------ | --------------------------------------------------------- |
| `packages/engine`  | TypeScript, Three.js, no React | DSL types, validator, state computation, props, player     |
| `packages/dsl`     | TypeScript + Zod               | Schema source of truth; JSON Schema for model prompts      |
| `packages/golden`  | TypeScript                     | Golden-set topics + regression runner                      |
| `apps/web`         | Next.js 15 (App Router)        | Request form, player, inspector, quick check, dashboard    |
| `apps/api`         | FastAPI, Python 3.12           | Agent crew, budgets, caching, keyframes, event ledger      |
| `tools/headless`   | Node + Three.js                | One PNG per scene for the Inspector                        |
| `db/migrations`    | Supabase Postgres 17           | Lessons, events, feedback, golden set — all under RLS      |
| `reference/`       | —                              | The single-pass prototype (`prototype.html`)               |
| `docs/`            | —                              | Phase reports, DSL changelog, prop backlog                 |

## Getting started

Prerequisites: Node ≥ 22, pnpm 10, Python 3.12, [uv](https://docs.astral.sh/uv/).

```bash
cp .env.example .env   # fill in real values
pnpm install
```

Web (Next.js):

```bash
pnpm --filter web dev
```

API (FastAPI):

```bash
cd apps/api
uv sync
uv run uvicorn app.main:app --reload
```

Tests and lint, everywhere:

```bash
pnpm lint && pnpm test
```

```bash
cd apps/api && uv run ruff check . && uv run pytest
```

## Database

Migrations live in `db/migrations/` and are applied with the Supabase CLI or
`psql` — see `db/README.md`. Every table has row-level security enabled;
`db/scripts/check_rls.py` is the CI guard that asserts it.

## Ground rules (short form)

- **Determinism boundary**: the engine never calls a model.
- **Validator is law**: every model output is clamped/repaired/counted first.
- **Append-only ledger**: state is derived from `lesson_events`.
- **Secrets stay server-side**: the browser never sees the Anthropic key.
