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
