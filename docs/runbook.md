# Sinaa Motion Lab — Runbook

Operator guide: how to stand the system up, run it, watch it, and fix it.

## Topology

| Piece | Where | Config |
| ----- | ----- | ------ |
| `apps/web` (Next.js) | Vercel | `apps/web/vercel.json`, env below |
| `apps/api` (FastAPI + crew) | Fly.io (Docker) | `apps/api/Dockerfile`, `apps/api/fly.toml` |
| Database | Supabase hosted Postgres | `db/migrations/`, RLS everywhere |
| Nightly golden run | GitHub Actions | `.github/workflows/nightly-golden.yml` |

The browser talks only to the API; the Anthropic key lives only on the API
host. Every secret comes from the platform's secret store — never the repo.

## 0. One-time setup order

1. **Supabase**: create a project at supabase.com → SQL editor → run
   `db/migrations/0001_init.sql` (or `supabase db push` with the CLI).
   Verify: Table Editor shows 8 tables, RLS enabled on all.
   Collect: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   (Settings → API).
2. **Fly.io (API)** — from the repo root:

   ```bash
   fly launch --no-deploy --copy-config --config apps/api/fly.toml --name <your-api-app>
   ```

   ```bash
   fly secrets set --config apps/api/fly.toml \
     ANTHROPIC_API_KEY=sk-ant-... \
     SUPABASE_URL=https://<ref>.supabase.co \
     SUPABASE_ANON_KEY=... \
     SUPABASE_SERVICE_ROLE_KEY=... \
     ALLOWED_ORIGINS=https://<your-web-domain> \
     GOLDEN_LANGUAGES=en,fr,ar
   ```

   ```bash
   fly deploy --config apps/api/fly.toml
   ```

   Verify: `curl https://<your-api-app>.fly.dev/health` →
   `{"status":"ok",...}`. (Railway alternative: new service from repo,
   Dockerfile path `apps/api/Dockerfile`, root context, same variables.)
3. **Vercel (web)**: import the GitHub repo → Root Directory **apps/web**
   (keep "Include files outside root directory" ON — the engine packages
   live at the repo root) → env var
   `NEXT_PUBLIC_API_URL=https://<your-api-app>.fly.dev` → deploy.
   Verify: open `/demo` (plays offline), then `/new` → generate → watch
   status → player.
4. **Nightly golden run**: GitHub repo → Settings → Secrets and variables →
   Actions → add secrets `ANTHROPIC_API_KEY`, `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (optional
   `VOYAGE_API_KEY` for exemplars) and, optionally, variable
   `PIPELINE=single|crew`. The workflow runs at 03:41 UTC, regenerates all
   36 topics with caching off, writes `golden_runs`/`golden_results`, and
   fails (red) on a regression beyond thresholds. Trigger manually:
   Actions → "Nightly golden run" → Run workflow.

## 1. Routine operations

- **Switch pipeline**: `fly secrets set PIPELINE=crew` (or `single`) — takes
  effect on restart. Crew and single cache under different fingerprints.
- **Bump a prompt**: edit `apps/api/prompts/<role>.md`, bump its
  `prompt_version` header (this moves every fingerprint → no stale cache
  hits), run `pnpm golden:run` locally or wait for the nightly, deploy.
- **Read a lesson's history**: `GET /lessons/{id}/events` — the append-only
  ledger: every agent call (tokens, latency, cost), repair, inspection,
  feedback.
- **Dashboards**: `/admin/golden` — last five runs, gate row, per-topic
  drill-down, feedback backlog (broken → engine; rest → prompt & prop).
- **Prop backlog**: `prop_requests` table (most-requested first) mirrors to
  `docs/prop-backlog.md` in dev.

## 2. Incident playbook

| Symptom | Check | Fix |
| ------- | ----- | --- |
| Generations stuck in `queued` | `fly logs` — worker crashed mid-task? | Redeploy; re-POST the same topic (failed rows requeue; in-flight rows return as-is) |
| Every generation `model_auth_failed` | `fly secrets list` | Set a valid `ANTHROPIC_API_KEY` |
| `validator_bridge_failed` | Node layer missing in image | Rebuild image; the Dockerfile installs the workspace with `--filter '!web'` |
| `keyframe_render_failed` (crew) | Chromium in image? Memory? | Image installs Playwright chromium; keep ≥ 2 GB VM |
| Web shows connection hiccup banner | API down or CORS | `/health`; `ALLOWED_ORIGINS` must include the web origin exactly |
| Nightly run red | Run log artifact: regression list | A metric regressed beyond thresholds — fix the offending change or accept by merging a new baseline deliberately |
| Costs spike | `lesson_events.payload.cost_usd` by day | Budgets cap calls per lesson; check for cache misses (fingerprint moved?) |

## 3. Rollback

- **API**: `fly releases --config apps/api/fly.toml` → `fly deploy --image <previous>`.
- **Web**: Vercel → Deployments → Promote previous.
- **Prompts are versioned in-repo**: reverting a prompt commit reverts
  fingerprints with it; cached lessons for the old version resurface
  automatically.
- **Database**: lesson_events is append-only (trigger-enforced) — state can
  always be re-derived; `lessons.current_script` is a cache.

## 4. Local development

```bash
pnpm install && cp .env.example .env   # fill in keys
```

```bash
cd apps/api && uv sync && uv run uvicorn app.main:app --reload
```

```bash
pnpm --filter web dev
```

Tests: `pnpm -r test` (under `xvfb-run -a` to exercise the gl keyframe
backend) and `cd apps/api && uv run pytest`. Golden set: `pnpm golden:run
--limit 3` for a cheap smoke, no flag for the full 36.
