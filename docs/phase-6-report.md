# Phase 6 — Learner surface

## Delivered
- **Feedback capture** (the mission's loop-closer): one row after the quiz — 👍, or 👎 with wrong / confusing / boring / broken, optional note, tied to the current scene index. `POST /lessons/{id}/feedback` stores the row AND appends a `feedback` event to the ledger. `GET /feedback` groups it for the dashboard: **broken → engine backlog**, the rest → **prompt & prop backlog**, both now rendered on `/admin/golden`.
- **Lesson rail**: `GET /lessons` (ready lessons) + a horizontal rail on the lesson page linking to other generated lessons.
- **Narration card**: always-visible words beside the stage captions, `aria-live="polite"`, scene number + title.
- **Share link**: clipboard copy with confirmation. **Language switch**: en/fr/ar buttons regenerate the same topic+audience in another language (new fingerprint → new lesson).
- **Accessibility**: keyboard transport (Space play/pause, ←/→ scenes, Home rewind; text inputs exempt), reduced-motion respected (`motion-safe:` pulses; playback only ever starts on user action), captions always visible, aria labels/roles on transport, language group and rail.
- **Mobile**: compact 300px canvas under 640px, wrap-friendly transport/controls, no horizontal scroll at 375px (verified: 0px overflow).
- **Engine fix found by this phase's testing**: player `tick` events now fire only when the transport moves — previously a paused player re-rendered its host UI at 60fps (visible as flaky clicks and wasted CPU).

## Tests
- API **38/38** (3 new: feedback roundtrip + grouping + ledger event; verdict validation + 404; ready-only lesson list).
- Browser verification **15/15** (Playwright, production builds, real API): player renders stored lesson; narration card; rail; Space/ArrowRight keyboard transport; share copies URL; language buttons; quiz scoring; feedback posts and confirms; broken lands in the engine backlog with topic + note; mobile 375px no-overflow + compact canvas; zero page errors.
- Engine 243/243 unchanged after the tick fix; whole workspace green.

## Metrics (when applicable)
| Page | Perf | A11y | Best practices | SEO |
| ---- | ---- | ---- | -------------- | --- |
| `/` | 100 | 95 | 100 | 100 |
| `/new` | 100 | 96 | 100 | 100 |
| `/demo` | 88 | 95 | 100 | 100 |
| `/lessons/[id]` | 77 | 95 | 100 | 100 |

(Lighthouse 13.6, headless Chromium, production `next start`. The lesson-page 77 is the three.js payload plus the client fetch waterfall — expected for a WebGL app; code-splitting the engine chunk further is a Phase 7+ option.)

## Screen recordings / screenshots (shared in chat)
1. `p6-walkthrough.webm` — full desktop flow: load lesson → Space to play → arrow-key scene change → share → quiz → thumbs-down → broken + note → confirmation, then the dashboard backlog showing the entry.
2. `p6-lesson.png` — lesson page after feedback.
3. `p6-mobile.png` — 375px layout.

## Deviations from the prompt
- The learner surface was exercised against **seeded built-in lessons** (the engine's own four-stroke and photosynthesis scripts stored as ready rows in the dev DB) because generated lessons remain blocked on the API key. This is real engine content through the real store/API/player path — nothing fabricated — but the surface has not yet shown a *generated* script.

## Known gaps
- A11y 95–96: remaining flags are contrast on dim neutral-500 helper text — worth one pass in Phase 7 polish.
- Language switch needs the API key to actually produce the new-language lesson (plumbs through `POST /lessons` like any request).
- Standing blockers unchanged: ANTHROPIC_API_KEY (all live metrics), GitHub Actions billing, Supabase provisioning.

## Needs my decision
- None for Phase 7's build. The standing key/billing/Supabase items now gate *deploy-time* value rather than code.

## Next phase preview
- Phase 7: web on Vercel, api containerized on Fly.io/Railway, Supabase hosted + migrations applied, platform secrets, nightly golden run writing to `golden_runs`, `docs/runbook.md`.
