# Phase 3 — Single-pass pipeline

## Delivered
- **API** (`apps/api`): `POST /lessons` creates a lesson row + `generation_started` event and runs the single-pass pipeline as a background task (generation never blocks the request); `GET /lessons/{id}` for polling (script included when ready, typed error when failed); `GET /lessons/{id}/events` exposes the ledger. CORS on for the web app.
- **Pipeline** (`apps/api/pipeline/`): one model call (`claude-opus-5-5`, system prompt cached via `cache_control`) → JSON parse → the engine's own TS validator via a node bridge (`packages/engine/scripts/validate-cli.ts`) so there is exactly one validator → events for every step (`agent_call` carries model, tokens, latency, cost; `validator_repairs` carries counts by code) → `ready` with `current_script` saved. Status transitions: queued → directing → inspecting → ready | failed.
- **Typed failures, never silent retries**: `budget_exceeded` (output truncated at the `budgets.MAX_TOKENS_PER_CALL` cap), `bad_model_json`, `unrepairable_script`, `model_auth_failed`, `internal`.
- **Fingerprint cache**: Python implementation byte-identical to the TS one (NUL-joined sha256; both suites pin the same vector `50c9c5d5…`). A repeated request returns the existing lesson with `cached: true` and makes **zero** model calls; a failed lesson re-queues on re-POST.
- **Store interface** (`pipeline/store.py`): the thin `save_event`/`get_cached`/`save_script`-style protocol from the integration path — `SupabaseStore` activates automatically when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set; `SqliteStore` (same event discipline) otherwise.
- **Prompt** (`apps/api/prompts/single-pass.md`, `prompt_version: single-pass@1`): hard rules (beats, 8–14 s scenes, motion ≤ 2 s, flow/count usage, 3 checks, untranslated technical vocabulary) with the prop catalogue (from `props.catalog.json`) and the generated JSON Schema embedded.
- **Web**: `/new` request form → `/lessons/[id]` status screen (animated pipeline steps) polling every 2 s → player on ready + script-inspector JSON toggle; `LessonPlayer` extracted from the demo and shared.
- Try: `uv run uvicorn app.main:app` (apps/api) + `pnpm --filter web dev` → http://localhost:3000/new.

## Tests
- API: **20/20** — `cd apps/api && uv run pytest` (fingerprint cross-language vector; store sequencing; pipeline happy-path with repairs logged, budget/json/unrepairable typed failures; HTTP cache-hit = no second model call; failed→requeue; 404s; validation).
- Browser (Playwright, production builds): **5/5** — form submits, redirects to `/lessons/[id]`, status screen renders, polling reaches the terminal state with the typed error surfaced, no page errors.
- Whole workspace still green: 265 JS tests, lint, builds, RLS guard.

## Metrics (when applicable)
| Metric | Value | Previous |
| ------ | ----- | -------- |
| API tests | 20 | 1 |
| Model calls on cache hit | 0 | — |
| Live generations | 3/3 ready (table below) | 0 |

### Live generations (2026-11-14, `claude-opus-5-5`, single-pass)

| Topic | Audience | Status | Validator repairs | Cost (USD) | Latency |
| ----- | -------- | ------ | ----------------- | ---------- | ------- |
| how a turbocharger works | curious teens | ready (7 scenes, 11 actors) | 1 (`clamped_coord`) | $0.1997 | 89.5 s |
| why the sky is blue | curious kids aged 10 | ready (7 scenes, 10 actors) | 0 | $0.2066 | 92.5 s |
| compound interest | busy adult professionals | ready (6 scenes, 9 actors) | 0 | $0.2065 | 92.9 s |

**Live finding — token cap raised 8192 → 16384.** The first live attempts (two per topic, ~$0.16 each) all failed typed `budget_exceeded`: every call returned exactly 8192 output tokens with `stop_reason: max_tokens`. On `claude-opus-5-5` adaptive thinking is always on and its tokens count toward `max_tokens`, so thinking plus a full script (~10K output tokens observed) cannot fit in 8192. `MAX_TOKENS_PER_CALL` was raised to 16384 (commit `b0df8f8`) mid-run; all three topics then succeeded on the first retry. Failed lessons re-queued on re-POST exactly as designed, and the error was typed end to end — no silent retries.

## Deviations from the prompt
- ~~**The three live end-to-end generations have not run yet.**~~ **Resolved 2026-11-14**: the key landed as `SINAA_MODEL_ACCESS` and the three generations ran live (table above). The original blocker note is kept for history: the container had no Anthropic credential and the status screen surfaced the real 401 as a typed failure; nothing was mocked outside clearly-labeled unit tests.
- **Store may run on SQLite first**: Supabase activates automatically when its env vars are set; migrations remain unapplied until then (Phase 0 note stands).
- Single-pass uses `claude-opus-5-5` (the current default model per Anthropic guidance); the Phase 5 crew keeps the mission's tiering (Opus-class Director via `SINAA_MODEL_COMPLEX`, Sonnet-class others via `SINAA_MODEL_DEFAULT`).

## Known gaps
- ~~Live generation metrics (repairs count, cost, latency) pending the API key.~~ Done — table above.
- GitHub Actions still blocked account-side (billing) — unchanged since STOP 0.

## Needs my decision
- ~~Add `ANTHROPIC_API_KEY` to the environment.~~ Done — the key propagates as `SINAA_MODEL_ACCESS` and live generation works.
- Optional, before Phase 4-5: create the Supabase project and add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` the same way. (Still open; the live runs recorded to the SQLite fallback.)

## Next phase preview
- `packages/golden`: `topics.json` (36 topics as data), runner `pnpm golden:run` with caching off.
- `golden_runs`/`golden_results` persistence + threshold comparison vs. the previous run.
- `/admin/golden` dashboard page; baseline run on the single-pass pipeline.
