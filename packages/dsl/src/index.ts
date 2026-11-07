/**
 * @sinaa/dsl — scene-script DSL v1: schema source of truth.
 * Shared by the engine (validator, player) and the pipeline (prompts).
 */
export * from "./palette";
export * from "./schema";
// The fingerprint helper uses node:crypto and is server-only:
// import it from "@sinaa/dsl/fingerprint".
