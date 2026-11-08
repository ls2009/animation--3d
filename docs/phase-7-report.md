# Phase 7 — Deploy

## Delivered
- **API container** (`apps/api/Dockerfile`, repo-root build context): Python 3.12 + Node 22 + the pnpm workspace (web excluded via `--filter '!web'`, manifest kept so the frozen lockfile resolves — verified), Playwright Chromium + xvfb so both keyframe backends work in production, `uv sync --frozen --no-dev`, single-worker uvicorn (generations are in-process background tasks). `.dockerignore` keeps secrets and junk out of the context.
- **Fly.io config** (`apps/api/fly.toml`): `/health` checks, `auto_stop_machines = "off"` + `min_machines_running = 1` so in-flight generations never die with a scale-to-zero, 2 GB VM for Chromium rendering. Railway path documented as the alternative.
- **Vercel config** (`apps/web/vercel.json`) + documented monorepo settings (Root Directory `apps/web`, include-files-outside-root, `NEXT_PUBLIC_API_URL`).
- **Production hardening**: CORS origins from `ALLOWED_ORIGINS` (default `*` only in dev); `.env.example` documents the production extras (`ALLOWED_ORIGINS`, `PIPELINE`, `VOYAGE_API_KEY`). Secrets live in platform stores only.
- **Nightly golden run** (`.github/workflows/nightly-golden.yml`): 03:41 UTC (off the congested minutes), secrets-gated with explicit warnings when missing, caching off, writes `golden_runs`/`golden_results` through the Supabase store, uploads the run table as an artifact, goes red on threshold regressions. Manual trigger supported.
- **Runbook** (`docs/runbook.md`): one-time setup order (Supabase → Fly → Vercel → nightly secrets) with verification steps, routine operations (pipeline switch, prompt bumps, ledger reads, dashboards), an incident playbook keyed to the pipeline's typed error codes, rollback procedures, and local dev.

## Tests
- API 38/38 after the CORS change; both workflow files YAML-validated; `fly.toml` TOML-validated; `vercel.json` JSON-validated; the Dockerfile's critical resolution step (`pnpm install --frozen-lockfile --filter '!web'`) verified against the real lockfile in this container.
- Full workspace remains green (268 JS + 38 Python tests).

## Metrics (when applicable)
| Metric | Value | Previous |
| ------ | ----- | -------- |
| Public URL | **not yet — needs your platform accounts** (below) | — |

## Deviations from the prompt
- **No public URL from this session.** Deploying requires accounts and credentials I don't have: Fly.io/Railway token, Vercel project, Supabase project — and this container's Docker daemon is not running, so even the image build could only be validated piecewise (every command the Dockerfile runs was exercised against this checkout where possible). Everything is staged so that the runbook's section 0 takes you from zero to public URLs in ~20 minutes of clicking; alternatively, hand me tokens via the environment (`FLY_API_TOKEN` as an env var; Vercel/Supabase likewise) plus network allowances and I'll run the deploy from a session.

## Known gaps
- The four standing user-side items now converge: **(1)** `ANTHROPIC_API_KEY` — gates generation everywhere, all pending live metrics (Phase 3 generations, Phase 4 baseline, Phase 5 comparison + default-pipeline recommendation); **(2)** GitHub Actions billing — gates CI *and* the new nightly golden run; **(3)** Supabase project — gates the production store and nightly persistence; **(4)** platform accounts — gate the public URLs.
- First real Docker build will happen on Fly's builders; the Dockerfile may need a minor touch-up there (typical first-deploy friction; the runbook's playbook covers the failure modes).

## Needs my decision
- How you want the deploy executed: **(a)** you follow runbook §0 yourself (fastest, no credential hand-off), or **(b)** you add `FLY_API_TOKEN` / Vercel / Supabase credentials to the environment plus the needed network hosts, and I run it end to end from a session and verify the public URLs.

## Next phase preview
- There is no Phase 8 in the mission. After deploy: run the full pending-metrics session (generations, baseline, single-vs-crew comparison, default recommendation), then iterate on quality via the golden gate and the feedback backlog — the loop this site was built to close.
