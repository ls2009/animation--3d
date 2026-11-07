# Phase 2 — Headless keyframes

## Delivered
- **Shared stage module** (`packages/engine/src/stage.ts`): backdrops, lights, floor, actor-visual application and the flow-particle pool, extracted from the player so the interactive player and the keyframe renderer cannot drift apart. Player refactored onto it; all 243 engine tests unchanged and green.
- **Offscreen renderer** (`packages/engine/src/offscreen.ts`): `createOffscreenStage(renderer, w, h).render(script, sceneIndex, t)` — one-shot, built on `computeState`, caller owns the WebGL context (browser canvas or headless-gl).
- **tools/headless** with BOTH backends in the mission's order:
  - `render-gl.ts`: headless-gl (native WebGL1 in-process; needs `xvfb-run -a` on bare servers). ~0.8 s for 6 scenes.
  - `render-playwright.ts`: esbuild-bundles the engine into a chromium page, renders to canvas, returns PNGs. ~1.6 s for 6 scenes. Selected automatically when gl can't build or can't create a context.
- **CLI**: `pnpm keyframes script.json out/ [--backend auto|gl|playwright] [--width N] [--height N]` — validates first (repairs printed, never silent), writes `scene-01.png` … per scene at its midpoint from the scripted camera.
- **CI**: chromium install + `xvfb-run -a pnpm -r test`, so both backends execute in CI once Actions is unblocked.

## Tests
- `@sinaa/headless`: 3/3 — engine lesson → **6 PNGs, each >10 KB, non-uniform pixels, pairwise distinct hashes**; playwright output **deterministic across runs**; gl backend same contract (runs under xvfb, auto-skips with a warning where no GL context exists). `pnpm --filter @sinaa/headless test`
- Full workspace under xvfb: 265/265 (dsl 17, engine 243, headless 3, web 1, golden 1); lint, typecheck and web build clean.
- CLI exercised end-to-end with both backends on the four-stroke lesson: 6 PNGs each, 0 repairs.

## Metrics (when applicable)
| Metric | Value | Previous |
| ------ | ----- | -------- |
| Keyframe render, 6 scenes (gl) | 0.8 s | — |
| Keyframe render, 6 scenes (playwright) | 1.6 s | — |
| Workspace tests | 265 | 263 |

## Deviations from the prompt
- None in substance. One nuance: headless-gl **builds** fine (prebuilt binary) but cannot create a GL context without an X server, so on this container and CI the gl path runs under `xvfb-run -a`; plain `pnpm keyframes` with `--backend auto` falls back to playwright exactly as specified.

## Known gaps
- The six keyframes read slightly dark/small at the default camera distances the lessons use; fine for the Inspector (actors and motion are legible), and visual polish is Phase 6's job. If Inspector accuracy suffers in Phase 5, bump exposure or FOV in `stage.ts` — one place, both renderers.
- GitHub Actions still blocked account-side (billing) — the new CI steps are in place but unverified on a real runner.

## Needs my decision
- None blocking Phase 3 (single-pass pipeline). Reminder: Phase 3 needs real `ANTHROPIC_API_KEY` + Supabase credentials in the environment (the mission's `.env` contract), and the Actions billing fix remains open.

## Next phase preview
- FastAPI `POST /lessons` + background generation task with status transitions queued → … → ready | failed.
- Single-pass prompt (full script in one model call), validator + event ledger + fingerprint cache in Supabase.
- Web request form and status screen polling `GET /lessons/{id}`; three fresh topics generated end-to-end with repairs count and cost attached to the STOP 3 report.
