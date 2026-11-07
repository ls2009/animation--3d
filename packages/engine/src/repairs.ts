/**
 * Validator repair codes — STABLE API. The pipeline counts these in the
 * event ledger and the golden-set runner regresses on them; never rename,
 * only add.
 */
export const REPAIR_CODES = [
  "version_fixed",
  "missing_title",
  "missing_language",
  "bad_camera",
  "bad_actor",
  "duplicate_actor",
  "too_many_actors",
  "unknown_prop",
  "aliased_prop",
  "bad_color",
  "bad_scene",
  "too_many_scenes",
  "clamped_duration",
  "bad_backdrop",
  "missing_beat",
  "bad_narration",
  "bad_step",
  "missing_actor",
  "too_many_steps",
  "clamped_coord",
  "clamped_step_time",
  "bad_control",
  "clamped_control",
  "dropped_check",
] as const;

export type RepairCode = (typeof REPAIR_CODES)[number];

export interface Repair {
  code: RepairCode;
  /** JSON-path-ish location, e.g. "scenes[2].steps[4]". */
  path: string;
  message: string;
}

export interface ValidatorStats {
  repairCount: number;
  byCode: Partial<Record<RepairCode, number>>;
  actors: number;
  scenes: number;
  steps: number;
  checks: number;
  controls: number;
}

export class NoScenesError extends Error {
  readonly code = "no_scenes";
  constructor() {
    super("script has no usable scenes — unrepairable");
  }
}

export class BadInputError extends TypeError {
  readonly code = "bad_input";
  constructor(got: string) {
    super(`script must be a JSON object, got ${got}`);
  }
}
