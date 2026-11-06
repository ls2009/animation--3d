# DSL changelog

The scene-script DSL is versioned; `packages/dsl/src/schema.ts` is the source
of truth. Every change to the schema is recorded here.

## 1.0 (planned — Phase 1)

- Base: the prototype's DSL v0 (actors, scenes, steps, narration, checks).
- Added `version` (required, `"1.0"`).
- Added `controls`: learner-facing sliders binding to `speed`, `scale`,
  `count`, `visible`. Scripts without controls remain valid.
- Added `scenes[].beat`: one sentence per scene stating what the learner must
  see happen — written by the Director, consumed by the Inspector.
