/**
 * @sinaa/engine — deterministic scene-script engine.
 *
 * Framework-free (no React), zero network calls. The same script renders
 * identically on every machine and offline. Course AI mounts createPlayer
 * behind a lesson's Animate button; nothing here imports from any app.
 */
export { validateScript } from "./validator";
export type { ValidateOptions, ValidateResult } from "./validator";
export {
  REPAIR_CODES,
  NoScenesError,
  BadInputError,
} from "./repairs";
export type { Repair, RepairCode, ValidatorStats } from "./repairs";

export { computeState, easeInOut } from "./state";
export type {
  ActorState,
  CameraState,
  ControlValues,
  FlowParticleState,
  SceneState,
} from "./state";

export {
  PROP_META,
  PROP_NAMES,
  PROP_ALIASES,
  PROP_LIBRARY_VERSION,
  PROP_BUILDERS,
  buildProp,
  resolvePropName,
  registerGltfResolver,
} from "./props/registry";
export type { PropBuilder, GltfResolver } from "./props/registry";
export type { PropMeta, PropDomain } from "./props/meta";

export { createPlayer } from "./player";
export type { Player, PlayerEvents, PlayerOptions } from "./player";

export { BUILTIN_LESSONS } from "./lessons";
