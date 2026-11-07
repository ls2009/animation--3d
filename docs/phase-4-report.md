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
| Baseline run | **pending ANTHROPIC_API_KEY** | — |

## Deviations from the prompt
- **Runner lives in `apps/api/pipeline/golden.py`**, not in `packages/golden`: the pipeline, store and budgets are Python, so the runner drives them in-process (no HTTP hop, no server needed); `packages/golden` keeps the data + types and `pnpm golden:run` is still the one command. Topics stay data either way.
- **Baseline not recorded**: a run without credentials would write a meaningless all-failed baseline that the first real run would then "compare" against. I ran a 1-topic smoke to prove the machinery and deleted the local dev DB. The real 36-topic baseline runs the moment the API key lands (same command, ~$4–6 at current pricing).

## Known gaps
- Baseline table (the STOP 4 deliverable's numbers) pending the key — same blocker as the Phase 3 live generations.
- GitHub Actions still blocked account-side (billing).
- Supabase still unprovisioned; the runner currently records to the SQLite fallback. When Supabase env vars land, the same runner writes to the real `golden_runs`/`golden_results`.

## Needs my decision
- Same as STOP 3: add `ANTHROPIC_API_KEY` (environment menu → "3d animation learning" → Edit → variables), then tell me **"run the baseline"** — I'll run the 36 topics, record the baseline table here, and also close out the Phase 3 live generations in the same session.

## Next phase preview
- The crew: Director / Set designer / Choreographer / Narrator prompts + contracts, Inspector with keyframes, Producer with budgets and retry table.
- `PIPELINE=single|crew` feature flag; exemplar retrieval (pgvector, zero-exemplar fallback).
- Golden-set comparison single vs crew → recommendation for the default.
