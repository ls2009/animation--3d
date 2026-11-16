# DSL changelog

The scene-script DSL is versioned; `packages/dsl/src/schema.ts` is the source
of truth. Every change to the schema is recorded here.

## 1.0 (shipped — Phase 1)

- Base: DSL v0 (actors, scenes, steps, narration, checks). Note: the
  prototype file was unavailable, so v0 semantics were implemented from the
  mission spec rather than ported; the 13 step actions and their timing
  semantics are defined by `packages/engine/src/state.ts` and locked by the
  per-action unit tests.
- Added `version` (required, `"1.0"`).
- Added `controls`: learner-facing sliders binding to `speed`, `scale`,
  `count`, `visible`. Scripts without controls remain valid.
- Added `scenes[].beat`: one sentence per scene stating what the learner must
  see happen — written by the Director, consumed by the Inspector.

## 1.0 — backdrop extension (Phase 8, additive)

- `scenes[].backdrop` enum extended from 4 values (`lab`, `nature`, `space`,
  `plain`) to 10: added `tech`, `body`, `finance`, `factory`, `sky`, `ocean`.
  Additive only — every existing script stays valid; `lab` remains the
  default. Each backdrop is a themed stage environment (sky-dome gradient,
  floor, fog and a deterministic scenery ring) built in
  `packages/engine/src/stage.ts`.
- No change to actors, steps, checks or controls. `kind:"text"` actors
  (present since 1.0) now render as 3D text panels on the stage and animate
  through the ordinary step system; prompts v2 ask for 1–3 of them.
