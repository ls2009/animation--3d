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
| Golden comparison single vs crew | recorded 2026-11-14 — below | — |

### Single vs crew — 36-topic golden comparison (2026-11-14, commit `b0df8f8`)

| Metric | Single-pass (baseline) | Crew |
| ------ | ---------------------- | ---- |
| Success rate | **100 % (36/36)** | **0 % (0/36)** |
| Mean validator repairs | 0.333 | n/a — no lesson reached `ready` (per-topic repairs 0–8 where the validator ran) |
| Inspector first-pass rate | n/a (no inspector in single-pass) | **8.76 %** |
| Mean cost / lesson | $0.1964 | $0.3795 |
| p50 latency | 85.1 s | 215.4 s |

Crew summary JSON: `{"topics": 36, "success_rate": 0.0, "mean_repairs": null, "inspector_first_pass_rate": 0.0876, "mean_cost_usd": 0.3795, "p50_runtime_s": 215.38, "regressions": ["success_rate fell 100.00% -> 0.00% (allowed -5pts)", "mean_cost_usd rose $0.1964 -> $0.3795 (allowed +25%)", "p50_runtime_s rose 85.05s -> 215.38s (allowed +30%)"], "previous_run_id": "53dbd269-b218-42d0-90a5-4383f44af5c7"}`. The regression gate **failed as designed** (exit 1) on all three metrics — not only the anticipated cost regression.

Crew failure modes (all 36 failures, typed):
- **18 × `contract_violation`** — role outputs exceed the role contracts' bounds: choreographer emits > 12 steps per scene (11), director beats' `sees` exceed 300 characters (4), set designer emits an actor `kind` outside `prop|text` (2), narrator emits > 3 narration lines per scene (1). The models' natural outputs for these 8–14 s scenes are richer than the contract limits assume.
- **12 × `inspection_failed`** — `content_wrong` verdicts persisting after both repair loops; the never-ship-a-wrong-lesson policy held and no script was saved.
- **6 × `budget_exceeded`** — choreographer repair-loop output truncated even at the raised 16384-token cap (5), authoring chain exceeded the 6-call cap (1).

## Deviations from the prompt
- **Budget arithmetic made explicit**: "max 6 model calls" cannot cover the five-role happy path *plus* any fails-back *plus* inspector loops. Implemented (documented in `budgets.py`): MAX_MODEL_CALLS=6 caps the authoring chain (happy path 4; one fallback cycle lands exactly on 6); inspection calls are governed by MAX_INSPECTOR_LOOPS=2 (initial inspection + per-loop fix/re-inspect). Absolute worst case 11 calls; anything beyond either cap is a typed `budget_exceeded`, never a silent retry.
- **Role contracts in Pydantic** rather than Zod — the pipeline is Python; same validate-before-next-role discipline, and the final script still passes the one TS validator.
- **Supabase `nearest_storyboards`** currently computes cosine client-side over recent passed storyboards (fine at this scale); swap to a pgvector RPC when volume demands — noted in code.
- ~~**Comparison run + default-pipeline recommendation pending**~~ **Resolved 2026-11-14** — the comparison ran live (tables above) and the recommendation below is data-based.

## Recommendation — default pipeline

**Keep `PIPELINE=single` as the default.** The data is one-sided on quality per dollar: single-pass shipped a validator-clean script for **every** topic at a mean $0.196 and p50 85 s, while the crew shipped **nothing** at 1.9× the cost and 2.5× the latency — $13.66 spent for zero ready lessons. The two quality signals we have for the crew are both poor in its current state: inspector first-pass rate 8.8 % (rendered keyframes almost never satisfy their beats on the first pass) and repairs are unmeasurable because no generation survived to `ready`.

The crew's failures are implementation-bound, not conceptual, and they cluster: half are role contracts tighter than what `claude-sonnet-5-5` naturally produces (step/beat/narration caps), a third are persistent `content_wrong` under the strict never-ship policy, and the rest are token/call budgets. Loosening contracts, raising the choreographer's repair-loop budget, and tuning the inspector rubric could plausibly make the crew competitive — but that is future work, and per the mission this report changes no code.

One honest caveat on the baseline's "100 %": single-pass success means the engine's validator accepted the script — no vision inspection runs in that pipeline. The crew's 8.8 % inspector first-pass rate hints that rendered content frequently misses its beat criteria, and single-pass output is simply never audited that way. The crew's inspection remains the only measured content-quality signal in the system; once the crew can complete generations, the comparison on quality (not just completion) is worth re-running.

## Known gaps
- ~~Live single-vs-crew golden comparison and the default recommendation — blocked on the API key.~~ Done — tables and recommendation above.
- The crew cannot currently complete a generation (0/36): contract bounds vs real model output, persistent `content_wrong` inspections, and repair-loop token budgets all need work before the crew is a viable default candidate.
- Inspector narration-retiming: when a repair loop rewrites choreography, prior narration is kept if the narrator's refresh fails its contract (timings are approximate by design).
- GitHub Actions billing and Supabase provisioning unchanged.

## Needs my decision
- ~~Add `ANTHROPIC_API_KEY` and say "run the comparison".~~ Done — the key landed as `SINAA_MODEL_ACCESS`; all pending metrics are recorded and the default recommendation is above.
- Whether to invest in making the crew viable (loosen role contracts to match real model output, raise the choreographer repair-loop budget, tune the inspector rubric) or double down on single-pass plus a standalone post-hoc inspector.

## Next phase preview
- Phase 6 learner surface polish: lesson rail, refined scene strip and narration card, feedback row (thumbs + verdict + scene index), share link, language switch, mobile layout.
- Accessibility: keyboard transport, reduced-motion, always-visible captions.
- Lighthouse pass.
