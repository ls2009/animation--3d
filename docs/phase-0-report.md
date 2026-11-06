# Phase 0 — Scaffold

## Delivered
- pnpm monorepo: root `package.json`, `pnpm-workspace.yaml` (apps/web, packages/*, tools/*), shared `tsconfig.base.json` and ESLint 9 flat config. Try: `pnpm install && pnpm lint && pnpm test`.
- Workspace package stubs with tests so Phase 1 extends rather than creates: `packages/dsl`, `packages/engine`, `packages/golden`, `tools/headless`.
- `apps/web`: Next.js 15.5 (App Router, Tailwind 4, TypeScript), landing placeholder, vitest render test. Try: `pnpm --filter web dev`.
- `apps/api`: FastAPI on Python 3.12 via uv, `GET /health`, pytest + ruff, `pipeline/budgets.py` placeholder (6 calls / 2 inspector loops / 8192-token cap), `prompts/` README. Try: `cd apps/api && uv sync && uv run uvicorn app.main:app`.
- `db/migrations/0001_init.sql`: all seven tables (lessons, lesson_events, storyboards, prop_requests, feedback, golden_runs, golden_results) with `created_at`, pgvector `vector(1024)`, append-only trigger on `lesson_events`, RLS enabled on every table, anon policies limited to reading ready lessons and inserting feedback. Guard: `python3 db/scripts/check_rls.py`.
- CI: `.github/workflows/ci.yml` with three jobs — web+packages (lint, test, build), api (ruff, pytest), db-guard (RLS check).
- `docs/`: phase-report templates 0–7 in the required format, `dsl-changelog.md`, `prop-backlog.md`.
- `.env.example` documenting ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GOLDEN_LANGUAGES=en,fr,ar.
- `reference/README.md` placeholder — see Known gaps.

## Tests
- Workspace (dsl, engine, golden, headless, web): 5/5 suites passed, `pnpm -r test`.
- Lint: all packages clean, `pnpm -r lint`; web build passes, `pnpm --filter web build`.
- API: 1/1 passed, `cd apps/api && uv run pytest`; `ruff check .` clean; live smoke test `curl /health` → `{"status":"ok","service":"sinaa-motion-lab-api"}`.
- DB guard: `python3 db/scripts/check_rls.py` → 7 tables, all with RLS enabled.

## Metrics (when applicable)
| Metric | Value | Previous |
| ------ | ----- | -------- |
| — | not applicable in Phase 0 | — |

## Deviations from the prompt
- **Single branch instead of branch-per-phase.** This session is bound to `claude/gracious-goodall-ijfel0` and must not push elsewhere without explicit permission, so Phase 0 lives there rather than on `phase-0-scaffold`. See Needs my decision.
- **RLS CI guard reimplemented.** The Course AI repo is out of scope and inaccessible, so `db/scripts/check_rls.py` is a fresh implementation of the same idea (static check: every `CREATE TABLE` in migrations must have `ENABLE ROW LEVEL SECURITY`).
- **`reference/prototype.html` and `.env` were not in the repo** (it was empty at session start). Per your decision: scaffold proceeded, `.env.example` ships now, you add the prototype before Phase 1 and real secrets before Phase 3.

## Known gaps
- **GitHub Actions does not execute on this repo.** The pushed workflow parses (all three jobs are enumerated) but every job dies in ~2 s with no logs produced — the signature of an Actions billing/spending-limit block on a private personal repo, not a workflow fault. All CI commands pass locally. Fix is owner-side: GitHub → Settings → Billing → check spending limit / payment method for Actions, or make the repo public. CI will go green on the next push once resolved.
- **`reference/prototype.html` missing**: blocks Phase 1 entirely (engine/validator/lessons are ported from it, not reinvented). Fix: commit it to `reference/` or upload it to the session.
- **No Supabase project provisioned**: migrations are written but unapplied. Needed before Phase 3.

## Needs my decision
- **Branch policy**: (a) keep everything on `claude/gracious-goodall-ijfel0` with phase-tagged commits — recommended, it matches this session's push constraints; or (b) explicitly permit per-phase branches (`phase-1-engine`, …) as the mission originally specified.
- **Actions billing**: resolve the Actions block (billing/spending limit, or make the repo public) so the CI gate is real from Phase 1 onward.
- **Prototype**: add `reference/prototype.html` before giving the Phase 1 go.

## Next phase preview
- Read `reference/prototype.html` fully; extract DSL v0, validator semantics, the three built-in lessons and the 90-prop library.
- Define DSL v1 in `packages/dsl/src/schema.ts` (Zod): v0 + `version`, `controls`, `beats`; export JSON Schema; start `docs/dsl-changelog.md` entries.
- Port validator (`validateScript` with stable repair codes), `computeState`, props and the Three.js player into `packages/engine`, with unit tests per step action and prop snapshot tests.
