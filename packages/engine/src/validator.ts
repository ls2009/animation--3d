/**
 * validateScript — the law. Every model output passes through here before
 * anything downstream sees it: clamp, repair, count. Never throws on a
 * repairable fault; throws only on non-object input (BadInputError) or no
 * usable scenes (NoScenesError). Every repair carries a stable code.
 */
import {
  type Actor,
  type Check,
  type Control,
  type Narration,
  type Scene,
  type Script,
  type Step,
  DSL_VERSION,
  HEX_RE,
  LIMITS,
  ScriptSchema,
  STEP_ACTIONS,
  isPaletteKey,
} from "@sinaa/dsl";
import {
  BadInputError,
  NoScenesError,
  type Repair,
  type RepairCode,
  type ValidatorStats,
} from "./repairs";
// Metadata only (no three.js in this import chain).
import { PROP_ALIASES, PROP_NAMES } from "./props/meta";

export interface ValidateOptions {
  /** Canonical prop names. Defaults to the engine's prop registry. */
  knownProps?: ReadonlySet<string>;
  /** alias -> canonical name. Defaults to the engine's prop registry. */
  propAliases?: ReadonlyMap<string, string>;
}

export interface ValidateResult {
  script: Script;
  warnings: Repair[];
  stats: ValidatorStats;
}

const FALLBACK_PROP = "block";

type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const ID_RE = /^[a-z0-9][a-z0-9_-]*$/;

function normalizeId(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const id = v.trim().toLowerCase().slice(0, 24);
  return ID_RE.test(id) ? id : undefined;
}

export function validateScript(raw: unknown, options: ValidateOptions = {}): ValidateResult {
  if (!isDict(raw)) {
    throw new BadInputError(raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw);
  }

  const warnings: Repair[] = [];
  const repair = (code: RepairCode, path: string, message: string) => {
    warnings.push({ code, path, message });
  };

  const knownProps = options.knownProps ?? PROP_NAMES;
  const aliases = options.propAliases ?? PROP_ALIASES;

  // -- header ---------------------------------------------------------------
  if (raw.version !== DSL_VERSION) {
    repair("version_fixed", "version", `set version to "${DSL_VERSION}"`);
  }
  const title = str(raw.title)?.slice(0, 160) ?? repairAnd("missing_title", "title", "defaulted title", repair, "Untitled lesson");
  const language = str(raw.language)?.slice(0, 12) ?? repairAnd("missing_language", "language", "defaulted language to en", repair, "en");

  // -- camera -----------------------------------------------------------------
  const W = LIMITS.world;
  const clampVec = (v: Dict | undefined, path: string, dflt: { x: number; y: number; z: number }) => {
    const x0 = num(v?.x), y0 = num(v?.y), z0 = num(v?.z);
    const x = x0 ?? dflt.x, y = y0 ?? dflt.y, z = z0 ?? dflt.z;
    const cx = clamp(x, -W.xMax, W.xMax);
    const cy = clamp(y, W.yMin, W.yMax);
    const cz = clamp(z, -W.zMax, W.zMax);
    if (cx !== x || cy !== y || cz !== z) {
      repair("clamped_coord", path, `clamped (${x},${y},${z}) to world bounds`);
    }
    return { x: cx, y: cy, z: cz };
  };

  let camera: Script["camera"];
  {
    const c = isDict(raw.camera) ? raw.camera : undefined;
    if (!c) repair("bad_camera", "camera", "camera missing, defaulted");
    const pos = { x: num(c?.x) ?? 14, y: num(c?.y) ?? 12, z: num(c?.z) ?? 30 };
    const look = clampVec(isDict(c?.look) ? (c?.look as Dict) : undefined, "camera.look", { x: 0, y: 4, z: 0 });
    camera = { ...pos, look };
  }

  // -- colors -----------------------------------------------------------------
  const fixColor = (v: unknown, path: string, dflt = "f"): string => {
    if (typeof v !== "string" || v.length === 0) return dflt;
    if (isPaletteKey(v) || HEX_RE.test(v)) return v;
    repair("bad_color", path, `unknown color "${v}", defaulted`);
    return dflt;
  };

  // -- actors -----------------------------------------------------------------
  const actors: Actor[] = [];
  const actorIds = new Set<string>();
  const rawActors = Array.isArray(raw.actors) ? raw.actors : [];
  rawActors.forEach((a, i) => {
    const path = `actors[${i}]`;
    if (!isDict(a)) return repair("bad_actor", path, "not an object, dropped");
    const id = normalizeId(a.id);
    if (!id) return repair("bad_actor", path, "missing/invalid id, dropped");
    if (actorIds.has(id)) return repair("duplicate_actor", path, `duplicate id "${id}", dropped`);
    if (actors.length >= LIMITS.maxActors) {
      return repair("too_many_actors", path, `over ${LIMITS.maxActors} actors, dropped "${id}"`);
    }
    const kind = a.kind === "text" ? "text" : "prop";
    let prop: string | undefined;
    if (kind === "prop") {
      const requested = str(a.prop)?.toLowerCase().trim() ?? FALLBACK_PROP;
      if (knownProps.has(requested)) {
        prop = requested;
      } else if (aliases.has(requested)) {
        prop = aliases.get(requested)!;
        repair("aliased_prop", `${path}.prop`, `"${requested}" resolved to "${prop}"`);
      } else {
        prop = FALLBACK_PROP;
        repair("unknown_prop", `${path}.prop`, `unknown prop "${requested}", replaced with "${FALLBACK_PROP}"`);
      }
    }
    const x0 = num(a.x) ?? 0, y0 = num(a.y) ?? 0, z0 = num(a.z) ?? 0;
    const x = clamp(x0, -W.xMax, W.xMax);
    const y = clamp(y0, W.yMin, W.yMax);
    const z = clamp(z0, -W.zMax, W.zMax);
    if (x !== x0 || y !== y0 || z !== z0) {
      repair("clamped_coord", path, `clamped position to world bounds`);
    }
    const size0 = num(a.size) ?? 2;
    const size = clamp(size0 > 0 ? size0 : 2, 0.1, 30);
    actors.push({
      id,
      kind,
      prop,
      label: typeof a.label === "string" ? a.label.slice(0, 80) : "",
      color: fixColor(a.color, `${path}.color`),
      x, y, z,
      size,
      hidden: a.hidden === true,
    });
    actorIds.add(id);
  });

  // -- scenes -----------------------------------------------------------------
  const scenes: Scene[] = [];
  const rawScenes = Array.isArray(raw.scenes) ? raw.scenes : [];
  rawScenes.forEach((s, si) => {
    const path = `scenes[${si}]`;
    if (!isDict(s)) return repair("bad_scene", path, "not an object, dropped");
    if (scenes.length >= LIMITS.maxScenes) {
      return repair("too_many_scenes", path, `over ${LIMITS.maxScenes} scenes, dropped`);
    }
    const dur0 = num(s.duration) ?? 10;
    const duration = clamp(dur0, LIMITS.minSceneDuration, LIMITS.maxSceneDuration);
    if (duration !== dur0) {
      repair("clamped_duration", `${path}.duration`, `clamped ${dur0}s to ${duration}s`);
    }
    let backdrop: Scene["backdrop"] = "lab";
    if (s.backdrop !== undefined) {
      if (s.backdrop === "lab" || s.backdrop === "nature" || s.backdrop === "space" || s.backdrop === "plain") {
        backdrop = s.backdrop;
      } else {
        repair("bad_backdrop", `${path}.backdrop`, `unknown backdrop "${String(s.backdrop)}", defaulted to lab`);
      }
    }
    const beat = typeof s.beat === "string" && s.beat.trim().length > 0 ? s.beat.slice(0, 300) : "";
    if (!beat) repair("missing_beat", `${path}.beat`, "scene has no beat");

    const narration: Narration[] = [];
    if (Array.isArray(s.narration)) {
      s.narration.forEach((n, ni) => {
        if (!isDict(n) || str(n.text) === undefined) {
          return repair("bad_narration", `${path}.narration[${ni}]`, "dropped malformed narration");
        }
        if (narration.length >= 6) {
          return repair("bad_narration", `${path}.narration[${ni}]`, "over 6 segments, dropped");
        }
        const t = clamp(num(n.t) ?? 0, 0, duration);
        narration.push({ t, text: (n.text as string).slice(0, 400) });
      });
    }

    const steps: Step[] = [];
    if (Array.isArray(s.steps)) {
      s.steps.forEach((st, sti) => {
        const spath = `${path}.steps[${sti}]`;
        const step = sanitizeStep(st, spath, duration);
        if (step === undefined) return;
        if (steps.length >= LIMITS.maxStepsPerScene) {
          return repair("too_many_steps", spath, `over ${LIMITS.maxStepsPerScene} steps, dropped`);
        }
        steps.push(step);
      });
    }

    scenes.push({
      title: str(s.title)?.slice(0, 120) ?? `Scene ${si + 1}`,
      duration,
      backdrop,
      beat,
      narration,
      keyFact: typeof s.keyFact === "string" ? s.keyFact.slice(0, 300) : "",
      steps,
    });
  });

  function sanitizeStep(st: unknown, spath: string, sceneDur: number): Step | undefined {
    if (!isDict(st)) {
      repair("bad_step", spath, "not an object, dropped");
      return undefined;
    }
    const action = st.action;
    if (typeof action !== "string" || !(STEP_ACTIONS as readonly string[]).includes(action)) {
      repair("bad_step", spath, `unknown action "${String(action)}", dropped`);
      return undefined;
    }
    const t0 = num(st.t) ?? 0;
    const t = clamp(t0, 0, sceneDur);
    if (t !== t0) repair("clamped_step_time", `${spath}.t`, `clamped t=${t0} into scene`);
    const dur = clamp(num(st.dur) ?? 1, 0, 60);

    const needActor = (field: string = "actor"): string | undefined => {
      const id = normalizeId(st[field]);
      if (!id || !actorIds.has(id)) {
        repair("missing_actor", `${spath}.${field}`, `unknown actor "${String(st[field])}", step dropped`);
        return undefined;
      }
      return id;
    };

    switch (action) {
      case "show":
      case "hide":
      case "highlight": {
        const actor = needActor();
        return actor ? { action, actor, t, dur } : undefined;
      }
      case "pulse": {
        const actor = needActor();
        if (!actor) return undefined;
        return {
          action, actor, t, dur,
          scale: clamp(num(st.scale) ?? 1.15, 1, 3),
          times: Math.round(clamp(num(st.times) ?? 3, 1, 12)),
        };
      }
      case "shake": {
        const actor = needActor();
        if (!actor) return undefined;
        return { action, actor, t, dur, amplitude: clamp(num(st.amplitude) ?? 0.3, 0, 5) };
      }
      case "move": {
        const actor = needActor();
        if (!actor) return undefined;
        if (!isDict(st.to)) {
          repair("bad_step", spath, "move without to:{x,y,z}, dropped");
          return undefined;
        }
        return { action, actor, t, dur, to: clampVec(st.to, `${spath}.to`, { x: 0, y: 0, z: 0 }) };
      }
      case "grow": {
        const actor = needActor();
        if (!actor) return undefined;
        const to = num(st.to);
        if (to === undefined || to <= 0) {
          repair("bad_step", spath, "grow without positive to, dropped");
          return undefined;
        }
        return { action, actor, t, dur, to: clamp(to, 0.1, 30) };
      }
      case "rotate": {
        const actor = needActor();
        if (!actor) return undefined;
        const axis = st.axis === "x" || st.axis === "z" ? st.axis : "y";
        return { action, actor, t, dur, axis, turns: clamp(num(st.turns) ?? 1, -50, 50) };
      }
      case "label": {
        const actor = needActor();
        if (!actor) return undefined;
        const text = typeof st.text === "string" ? st.text.slice(0, 80) : undefined;
        if (text === undefined) {
          repair("bad_step", spath, "label without text, dropped");
          return undefined;
        }
        return { action, actor, t, dur, text };
      }
      case "count": {
        const actor = needActor();
        if (!actor) return undefined;
        const from = num(st.from), to = num(st.to);
        if (from === undefined || to === undefined) {
          repair("bad_step", spath, "count without numeric from/to, dropped");
          return undefined;
        }
        return {
          action, actor, t, dur, from, to,
          prefix: typeof st.prefix === "string" ? st.prefix.slice(0, 20) : "",
          suffix: typeof st.suffix === "string" ? st.suffix.slice(0, 20) : "",
        };
      }
      case "color": {
        const actor = needActor();
        if (!actor) return undefined;
        return { action, actor, t, dur, to: fixColor(st.to, `${spath}.to`, "c") };
      }
      case "flow": {
        const from = needActor("from");
        const to = needActor("to");
        if (!from || !to) return undefined;
        const shape = st.shape === "cube" || st.shape === "drop" ? st.shape : "sphere";
        return {
          action, from, to, t, dur,
          count: Math.round(clamp(num(st.count) ?? 8, 1, 60)),
          shape,
          color: fixColor(st.color, `${spath}.color`, "c"),
        };
      }
      case "camera": {
        if (!isDict(st.to) || !isDict(st.look)) {
          repair("bad_step", spath, "camera without to/look, dropped");
          return undefined;
        }
        return {
          action, t, dur,
          to: clampVec(st.to, `${spath}.to`, { x: 14, y: 12, z: 30 }),
          look: clampVec(st.look, `${spath}.look`, { x: 0, y: 4, z: 0 }),
        };
      }
    }
    return undefined;
  }

  if (scenes.length === 0) throw new NoScenesError();

  // -- controls ---------------------------------------------------------------
  const controls: Control[] = [];
  if (Array.isArray(raw.controls)) {
    raw.controls.forEach((c, ci) => {
      const path = `controls[${ci}]`;
      if (!isDict(c)) return repair("bad_control", path, "not an object, dropped");
      if (controls.length >= 6) return repair("bad_control", path, "over 6 controls, dropped");
      const id = str(c.id)?.slice(0, 24);
      const label = str(c.label)?.slice(0, 60);
      const min = num(c.min), max = num(c.max);
      if (!id || !label || min === undefined || max === undefined || min >= max) {
        return repair("bad_control", path, "missing id/label or bad range, dropped");
      }
      const dflt0 = num(c.default) ?? min;
      const dflt = clamp(dflt0, min, max);
      if (dflt !== dflt0) repair("clamped_control", `${path}.default`, `clamped default into [${min},${max}]`);
      const binds: Control["binds"] = [];
      if (Array.isArray(c.binds)) {
        c.binds.forEach((b, bi) => {
          if (!isDict(b)) return repair("bad_control", `${path}.binds[${bi}]`, "bad bind, dropped");
          const actor = normalizeId(b.actor);
          const property = b.property;
          if (!actor || !actorIds.has(actor)) {
            return repair("bad_control", `${path}.binds[${bi}]`, `bind to unknown actor, dropped`);
          }
          if (property !== "speed" && property !== "scale" && property !== "count" && property !== "visible") {
            return repair("bad_control", `${path}.binds[${bi}]`, `unknown property "${String(property)}", dropped`);
          }
          if (binds.length < 6) binds.push({ actor, property });
        });
      }
      if (binds.length === 0) return repair("bad_control", path, "no valid binds, dropped");
      controls.push({ id, label, min, max, default: dflt, binds });
    });
  }

  // -- checks -----------------------------------------------------------------
  const checks: Check[] = [];
  if (Array.isArray(raw.checks)) {
    raw.checks.forEach((c, ci) => {
      const path = `checks[${ci}]`;
      if (!isDict(c)) return repair("dropped_check", path, "not an object, dropped");
      if (checks.length >= LIMITS.maxChecks) {
        return repair("dropped_check", path, `over ${LIMITS.maxChecks} checks, dropped`);
      }
      const question = str(c.question)?.slice(0, 300);
      const options = Array.isArray(c.options)
        ? c.options.filter((o): o is string => typeof o === "string" && o.length > 0).map((o) => o.slice(0, 200)).slice(0, 5)
        : [];
      const answer = num(c.answer);
      if (!question || options.length < 2 || answer === undefined || !Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        return repair("dropped_check", path, "malformed check, dropped");
      }
      checks.push({
        question,
        options,
        answer,
        explain: typeof c.explain === "string" ? c.explain.slice(0, 400) : "",
      });
    });
  }

  const script: Script = ScriptSchema.parse({
    version: DSL_VERSION,
    title,
    language,
    camera,
    actors,
    scenes,
    controls,
    checks,
  });

  const byCode: ValidatorStats["byCode"] = {};
  for (const w of warnings) byCode[w.code] = (byCode[w.code] ?? 0) + 1;

  return {
    script,
    warnings,
    stats: {
      repairCount: warnings.length,
      byCode,
      actors: actors.length,
      scenes: scenes.length,
      steps: scenes.reduce((n, s) => n + s.steps.length, 0),
      checks: checks.length,
      controls: controls.length,
    },
  };
}

function repairAnd<T>(
  code: RepairCode,
  path: string,
  message: string,
  repair: (code: RepairCode, path: string, message: string) => void,
  value: T,
): T {
  repair(code, path, message);
  return value;
}

