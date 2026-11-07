# Phase 1 — Engine package

## Delivered
- **DSL v1** (`packages/dsl/src/schema.ts`): Zod source of truth — actors, 13 step actions (`show hide move grow pulse rotate highlight shake label count color flow camera`), scenes with `beat`/narration/`keyFact`, `controls` (speed/scale/count/visible binds), checks; limits 24 actors / 9 scenes / 12 steps / 6 checks / 3–60 s. `schema.json` generated via `pnpm --filter @sinaa/dsl gen`. Changelog in `docs/dsl-changelog.md`.
- **Fingerprint** (`packages/dsl/src/fingerprint.ts`, server-only subpath `@sinaa/dsl/fingerprint`): sha256 over version+topic+audience+language+prop_library_version+prompt_version, with a pinned stability vector in tests.
- **Validator** (`packages/engine/src/validator.ts`): `validateScript(raw) → {script, warnings[], stats}`; throws only `BadInputError`/`NoScenesError`; 24 stable repair codes; unknown props → `block`; aliases resolve with a logged `aliased_prop`; world clamps ±40 / −5…30 / ±30.
- **computeState** (`packages/engine/src/state.ts`): pure, three-free, deterministic; scenes evaluate from base state so any midpoint renders in isolation (what the Phase 2 Inspector needs); controls change inputs, never the script.
- **Prop library**: 90 composed-primitive props in 7 domain files under `packages/engine/src/props/`, `(colorHex) => THREE.Group`, floor origin, nominal height, transparent-capable materials, `userData.tinted`; `props.catalog.json` generated (`pnpm --filter @sinaa/engine gen:catalog`); glTF upgrade path wired via `registerGltfResolver` with the assets folder empty, as specified.
- **Player** (`packages/engine/src/player.ts`): `createPlayer(canvas, labelsEl)` — orbit (learner drag overrides scripted camera until seek/scene change), HTML label overlay, SpeechSynthesis voice, flow particle pool, scrub/seek/next/prev, control values, event API, dispose.
- **Three built-in lessons** (`packages/engine/src/lessons.ts`): four-stroke engine, photosynthesis, TCP handshake — beats, keyFacts, 2–3 narration segments per scene, one control each, 3 checks each; all validate with zero repairs.
- **Demo page** (`apps/web/app/demo/`): lesson switcher, 3D stage, always-visible captions, scene strip, scrub, voice toggle, learner control sliders, key-fact card, three-question quick check with explanations and score. Try: `pnpm --filter web dev` → http://localhost:3000/demo.

## Tests
- `@sinaa/dsl`: 17/17 — `pnpm --filter @sinaa/dsl test`
- `@sinaa/engine`: 243/243 (validator contract + every repair code; every step action at t=0/mid/end; 90 prop contract tests; 90 structural snapshots; zero-repair lessons) — `pnpm --filter @sinaa/engine test`
- Web + stubs: 3/3; `pnpm -r lint`, `pnpm -r build`, api ruff/pytest, RLS guard all clean.
- Browser verification (Playwright against `next start`): 10/10 — canvas renders non-blank pixels, play advances time and pixels change, scene seek switches narration, scrub sets time, lesson switch loads a new script, controls render, quiz reveals answers, no page errors. Screenshots shared in chat.

## Metrics (when applicable)
| Metric | Value | Previous |
| ------ | ----- | -------- |
| Engine tests | 243 | 1 (stub) |
| Props in catalogue | 90 | 0 |
| /demo first-load JS | 265 kB | — |

## Deviations from the prompt
- **Built from spec, not ported.** `reference/prototype.html` never existed in the repo; you chose "build from spec". DSL v0 semantics (the 13 actions' timing/easing) are therefore defined by `state.ts` and locked by tests, not inherited from the prototype. If the prototype surfaces later, diffing semantics against it is a bounded task.
- **Prop snapshots are structural, not PNG hashes.** PNG hashes differ across GPUs/drivers (local vs CI software rendering), which would make the suite flaky. Each prop instead snapshots geometry types + rounded world positions + material flags (deterministic everywhere), and the Playwright check verifies real pixels render. Pixel-level prop rendering arrives with the Phase 2 headless renderer, where one environment produces the reference images.
- **computeState scene model**: scenes start from the script's declared base state rather than inheriting the previous scene's end state — chosen so scrubbing and per-scene keyframe rendering are exact, and authored lessons set positions per scene. Documented in `state.ts`.

## Known gaps
- **CI on GitHub still blocked account-side**: run 3 (this phase's push) failed in ~3 s before any job executed, same as runs 1–2 — the GitHub Actions billing/spending-limit issue on this private repo is not yet resolved. Every CI command passes locally (same commands the workflow runs). Fix: GitHub → Settings → Billing, or make the repo public.
- `grow` interacting with a simultaneous `pulse` multiplies (by design) but is untested in combination; low risk.
- Voice uses browser SpeechSynthesis voices — quality varies by OS; no server TTS (out of scope for Phase 1).

## Needs my decision
- **GitHub Actions billing** (carried over from STOP 0): still failing instantly; the golden-set regression gate (Phase 4) needs working CI to mean anything.
- Nothing else blocks Phase 2. (FYI: headless-gl may fail to build; Playwright is the sanctioned fallback per the mission.)

## Next phase preview
- `tools/headless`: render one PNG per scene at its midpoint from the scripted camera, via headless-gl → Playwright fallback.
- CLI `pnpm keyframes script.json out/`.
- Test: the engine lesson yields 6 PNGs with non-uniform pixels; attach the six keyframes to the STOP 2 report.
