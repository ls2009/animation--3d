# Phase 4 — Golden set runner

## Delivered
- **Golden set as data** (`packages/golden/topics.json`): 36 topics = the mission's 12 subjects × 3 audiences (curious kids aged 10 / high-school students / busy adult professionals), languages balanced 12/12/12 across GOLDEN_LANGUAGES (en, fr, ar) with every subject covering all three. Edit the JSON, not code. `@sinaa/golden` loads + types it; shape tests enforce the 12×3 structure.
- **Runner** (`pnpm golden:run`, implemented in `apps/api/pipeline/golden.py`): generates every topic with **caching OFF** (existing lessons are re-queued and regenerated; the ledger accumulates), stores a `golden_runs` row (git sha, prompt versions) and one `golden_results` row per topic (status, repairs, inspector pass rate, runtime, cost, script, lesson_id), prints the table + summary, and **exits 1** when any metric regresses beyond the thresholds vs the previous completed run. Flags: `--limit N`, `--workers N` (default 4, threaded).
- **Thresholds** exactly per the mission table (success −5 pts, repairs +1, inspector −10 pts, cost +25 %, p50 +30 %); the inspector metric is recorded as null and its threshold skipped until the Phase 5 Inspector exists.
- **API**: `GET /golden/runs?limit=5`, `GET /golden/runs/{id}/results`.
- **Dashboard** (`/admin/golden`): last five runs side by side (success, repairs, inspector, cost, p50, gate pass/FAIL with regression tooltips), per-topic drill-down for the selected run with links into the lesson player. Inspector keyframes and the feedback backlog join in Phases 5–6 as planned.
- Store: golden methods added to the protocol and both implementations; `golden_results.lesson_id` added to the migration (RLS guard still 7/7).

## Tests
- API: **24/24** (`uv run pytest`) — runner persists run+results and summary; caching-off proven (same topics, new model calls); regression gate fires on a worsened second run; `compare()` covered per-metric including the None-skip; `summarize()` edge cases.
- `@sinaa/golden`: 4/4 (36 topics, unique ids, language balance, per-subject coverage).
- Live smoke of the real command: `pnpm golden:run --limit 1` executed end to end — table printed, run persisted, typed `model_auth_failed` surfaced, exit 0 (first run has no baseline); `/admin/golden` rendered it in the browser (screenshot shared). Dev DB wiped afterwards so the true baseline starts clean.
- Workspace unchanged: 269 JS tests + web build green.

## Metrics (when applicable)
| Metric | Value | Previous |
| ------ | ----- | -------- |
| Topics in golden set | 36 | — |
| Baseline run (2026-11-14, single-pass, `claude-opus-5-5`) | recorded — below | — |
| Success rate | **36/36 = 100 %** | — |
| Mean validator repairs | **0.333** | — |
| Inspector first-pass rate | n/a (Phase 5 Inspector) | — |
| Mean cost / lesson | **$0.1964** | — |
| p50 runtime | **85.1 s** | — |

Run recorded at commit `b0df8f8` (the 16384-token cap — see the Phase 3 live finding; at the original 8192 cap the single-pass pipeline failed deterministically with `budget_exceeded`). Caching OFF, `--workers 4`, SQLite store (Supabase env vars still absent). Summary JSON: `{"topics": 36, "success_rate": 1.0, "mean_repairs": 0.333, "inspector_first_pass_rate": null, "mean_cost_usd": 0.1964, "p50_runtime_s": 85.05, "regressions": [], "previous_run_id": null}`. Per-topic table in the appendix below.

## Deviations from the prompt
- **Runner lives in `apps/api/pipeline/golden.py`**, not in `packages/golden`: the pipeline, store and budgets are Python, so the runner drives them in-process (no HTTP hop, no server needed); `packages/golden` keeps the data + types and `pnpm golden:run` is still the one command. Topics stay data either way.
- ~~**Baseline not recorded**~~ **Resolved 2026-11-14**: the real 36-topic baseline ran live once the key landed (~$7.07 actual, slightly above the $4–6 estimate because real scripts run ~10K output tokens each). The original rationale stands: no meaningless all-failed baseline was ever written.

## Known gaps
- ~~Baseline table (the STOP 4 deliverable's numbers) pending the key.~~ Done — metrics above, per-topic appendix below.
- GitHub Actions still blocked account-side (billing).
- Supabase still unprovisioned; the baseline was recorded to the SQLite fallback. When Supabase env vars land, the same runner writes to the real `golden_runs`/`golden_results`.

## Needs my decision
- ~~Add `ANTHROPIC_API_KEY` and say "run the baseline".~~ Done — the key landed as `SINAA_MODEL_ACCESS` and the baseline is recorded above.

## Next phase preview
- The crew: Director / Set designer / Choreographer / Narrator prompts + contracts, Inspector with keyframes, Producer with budgets and retry table.
- `PIPELINE=single|crew` feature flag; exemplar retrieval (pgvector, zero-exemplar fallback).
- Golden-set comparison single vs crew → recommendation for the default.

## Appendix — baseline per-topic results (single-pass, 2026-11-14)

| Topic | Status | Repairs | Runtime | Cost |
| ----- | ------ | ------- | ------- | ---- |
| four-stroke-engine--kids | ready | 1 | 88.7 s | $0.204 |
| four-stroke-engine--teens | ready | 0 | 85.0 s | $0.207 |
| four-stroke-engine--adults | ready | 1 | 87.9 s | $0.205 |
| turbocharger--kids | ready | 0 | 87.5 s | $0.207 |
| turbocharger--teens | ready | 1 | 90.0 s | $0.215 |
| turbocharger--adults | ready | 1 | 93.1 s | $0.219 |
| photosynthesis--kids | ready | 0 | 73.9 s | $0.171 |
| photosynthesis--teens | ready | 1 | 84.1 s | $0.194 |
| photosynthesis--adults | ready | 1 | 80.6 s | $0.179 |
| blood-circulation--kids | ready | 0 | 77.8 s | $0.179 |
| blood-circulation--teens | ready | 1 | 102.0 s | $0.237 |
| blood-circulation--adults | ready | 0 | 105.7 s | $0.244 |
| tcp-handshake--kids | ready | 0 | 64.8 s | $0.148 |
| tcp-handshake--teens | ready | 1 | 76.2 s | $0.176 |
| tcp-handshake--adults | ready | 0 | 73.9 s | $0.162 |
| dns--kids | ready | 0 | 67.4 s | $0.156 |
| dns--teens | ready | 0 | 78.9 s | $0.190 |
| dns--adults | ready | 0 | 67.2 s | $0.161 |
| supply-and-demand--kids | ready | 0 | 85.2 s | $0.203 |
| supply-and-demand--teens | ready | 0 | 77.7 s | $0.188 |
| supply-and-demand--adults | ready | 1 | 72.5 s | $0.163 |
| compound-interest--kids | ready | 0 | 104.4 s | $0.222 |
| compound-interest--teens | ready | 1 | 100.7 s | $0.223 |
| compound-interest--adults | ready | 0 | 86.3 s | $0.198 |
| newtons-third-law--kids | ready | 0 | 88.7 s | $0.206 |
| newtons-third-law--teens | ready | 1 | 113.9 s | $0.249 |
| newtons-third-law--adults | ready | 0 | 85.1 s | $0.189 |
| sky-blue--kids | ready | 0 | 86.1 s | $0.193 |
| sky-blue--teens | ready | 0 | 84.2 s | $0.192 |
| sky-blue--adults | ready | 0 | 102.3 s | $0.233 |
| vaccines--kids | ready | 0 | 84.8 s | $0.200 |
| vaccines--teens | ready | 0 | 94.0 s | $0.217 |
| vaccines--adults | ready | 0 | 83.7 s | $0.195 |
| lithium-battery--kids | ready | 0 | 76.9 s | $0.165 |
| lithium-battery--teens | ready | 1 | 90.1 s | $0.200 |
| lithium-battery--adults | ready | 0 | 78.4 s | $0.180 |
