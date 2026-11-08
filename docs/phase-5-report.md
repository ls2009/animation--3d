# Phase 5 — The crew

## Delivered
- **Producer** (`apps/api/pipeline/producer.py`, no model of its own): orchestrates the five roles, enforces budgets, consults the fails-back table, writes an `agent_call` event per call ({role, prompt_version, model, tokens, latency, cost}), an `inspection` event per loop, `validator_repairs`, and `ready`/`failed`. Status flow: queued → directing → designing → choreographing → inspecting → ready | failed.
- **Roles & contracts**: five prompts in `apps/api/prompts/*.md`, each with a `prompt_version` header; one input and one output contract per role (`pipeline/contracts.py`), validated before the next role runs — agents only ever see validated artefacts. Director runs on the complex tier (`claude-opus-5-5`), the rest on the default tier (`claude-sonnet-5-5`), per the mission's table.
- **Fails-back table implemented exactly**: Director → typed error to the user (no retry); Set designer → Director once; Choreographer → Set designer once; Narrator → Choreographer once; Inspector → Choreographer, max 2 loops with `fix_hint`s injected into the choreographer prompt.
- **Inspector**: deterministic validator first (repairs logged, never judged), then one keyframe per scene at its midpoint via the Phase 2 headless renderer, each frame judged with vision against its **beat** (the acceptance criterion), narration and the set designer's `layout_notes`. Pass policy per mission: every scene passes, or ≤ 1 scene failing on a cosmetic reason (overlap, off_camera) after the final loop; persistent `content_wrong` fails the generation — a wrong lesson is never shipped (verified: no script is saved in that path).
- **Exemplar retrieval**: `embed()` behind one function (Voyage `voyage-3-large`, 1024-dim matching `storyboards.embedding vector(1024)`, when `VOYAGE_API_KEY` is set; zero-exemplar fallback otherwise). Passed storyboards are stored as exemplars; the Director receives the nearest 3.
- **Prop requests**: Set designer emits `{name, why, nearest_existing}` and uses the nearest; the Producer upserts counts in the store and mirrors rows into `docs/prop-backlog.md` when the file is present.
- **Feature flag** `PIPELINE=single|crew` (default `single`); both pipelines share the fingerprint/run interface, so `/lessons`, the golden runner and the dashboard work with either. The golden runner now records inspector first-pass rate and per-role prompt versions.

## Tests
- API: **35/35** (`uv run pytest`), 11 new crew tests: happy path (5 calls, events in role order, pass_rate 1.0, exemplar stored, prop request counted); zero-exemplar fallback and exemplar injection; set-designer→director fallback (role sequence asserted, exactly at the 6-call cap); director failure typed with no retry; narrator scene-mismatch→choreographer fallback; budget breach typed (`budget_exceeded`); inspector loop repairing then shipping (fix hints asserted in the choreographer prompt); single-cosmetic-failure acceptance; persistent content_wrong → `inspection_failed` with **no script saved**; PIPELINE flag selects the crew; crew and single fingerprints differ (separate cache namespaces).
- Workspace: 268 JS tests + lint/builds all green.

## Metrics (when applicable)
| Metric | Value | Previous |
| ------ | ----- | -------- |
| Crew model calls, happy path | 5 (4 authoring + 1 inspection) | 1 (single-pass) |
| Max calls (fallbacks + 2 loops) | 6 + 5 = 11, typed error beyond | — |
| Golden comparison single vs crew | **pending ANTHROPIC_API_KEY** | — |

## Deviations from the prompt
- **Budget arithmetic made explicit**: "max 6 model calls" cannot cover the five-role happy path *plus* any fails-back *plus* inspector loops. Implemented (documented in `budgets.py`): MAX_MODEL_CALLS=6 caps the authoring chain (happy path 4; one fallback cycle lands exactly on 6); inspection calls are governed by MAX_INSPECTOR_LOOPS=2 (initial inspection + per-loop fix/re-inspect). Absolute worst case 11 calls; anything beyond either cap is a typed `budget_exceeded`, never a silent retry.
- **Role contracts in Pydantic** rather than Zod — the pipeline is Python; same validate-before-next-role discipline, and the final script still passes the one TS validator.
- **Supabase `nearest_storyboards`** currently computes cosine client-side over recent passed storyboards (fine at this scale); swap to a pgvector RPC when volume demands — noted in code.
- **Comparison run + default-pipeline recommendation pending**: still no `ANTHROPIC_API_KEY` in the environment, so neither pipeline can generate for real. `PIPELINE=single` stays the default until the data exists.

## Known gaps
- Live single-vs-crew golden comparison (the STOP 5 table) and therefore the default recommendation — blocked on the API key, as are the Phase 3 generations and Phase 4 baseline.
- Inspector narration-retiming: when a repair loop rewrites choreography, prior narration is kept if the narrator's refresh fails its contract (timings are approximate by design).
- GitHub Actions billing and Supabase provisioning unchanged.

## Needs my decision
- **The one blocker for all pending metrics**: add `ANTHROPIC_API_KEY` to the "3d animation learning" environment (title-bar environment menu → Edit → environment variables). Then say **"run the comparison"** — I'll run: the 3 Phase-3 generations, the 36-topic single-pass baseline, the 36-topic crew run, fill all pending report tables and recommend the default pipeline with reasons.

## Next phase preview
- Phase 6 learner surface polish: lesson rail, refined scene strip and narration card, feedback row (thumbs + verdict + scene index), share link, language switch, mobile layout.
- Accessibility: keyboard transport, reduced-motion, always-visible captions.
- Lighthouse pass.
