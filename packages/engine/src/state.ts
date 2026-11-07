/**
 * computeState — pure, deterministic state computation. No three.js, no DOM,
 * no clocks: (script, sceneIndex, t, controls) in, plain state out. The
 * player and the headless renderer both consume this, which is what makes
 * the same script render identically everywhere.
 *
 * Scene model: every scene starts from the script's declared base state
 * (actors at their declared positions), so scenes are independently
 * scrubbable and the Inspector can render any scene midpoint in isolation.
 * An actor that a scene `show`s starts that scene hidden.
 *
 * Controls change state-computation INPUTS, never the script:
 *   speed   multiplies rotate turns          scale  multiplies actor scale
 *   count   multiplies flow particle count   visible toggles at >= 0.5
 * Multiplier controls are normalized by their default (default -> x1).
 */
import {
  type Script,
  type Scene,
  type Step,
  type Vec3,
  resolveColor,
} from "@sinaa/dsl";

export interface ActorState {
  x: number;
  y: number;
  z: number;
  rotation: { x: number; y: number; z: number };
  /** Multiplier on the actor's base size. */
  scale: number;
  opacity: number;
  /** Resolved #rrggbb. */
  color: string;
  label: string;
  /** Count overlay (e.g. "3 of 4"), shown next to the label when set. */
  labelValue?: string;
  /** 0..1 emphasis (emissive boost). */
  highlight: number;
  visible: boolean;
}

export interface FlowParticleState {
  x: number;
  y: number;
  z: number;
  shape: "sphere" | "cube" | "drop";
  color: string;
  /** 0..1 along the journey (for sizing/fading). */
  progress: number;
}

export interface CameraState {
  x: number;
  y: number;
  z: number;
  look: Vec3;
}

export interface SceneState {
  actors: Record<string, ActorState>;
  camera: CameraState;
  flows: FlowParticleState[];
  /** Index of the active narration segment, or -1. */
  narrationIndex: number;
}

export type ControlValues = Record<string, number>;

export const easeInOut = (p: number): number =>
  p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

const progressOf = (time: number, t: number, dur: number): number => {
  if (dur <= 0) return time >= t ? 1 : 0;
  return Math.min(1, Math.max(0, (time - t) / dur));
};

function hexLerp(a: string, b: string, p: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const ca = (pa >> shift) & 0xff;
    const cb = (pb >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * p);
  };
  const v = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return `#${v.toString(16).padStart(6, "0")}`;
}

interface ControlFactors {
  speed: Map<string, number>;
  scale: Map<string, number>;
  count: Map<string, number>;
  hidden: Set<string>;
}

function controlFactors(script: Script, values: ControlValues | undefined): ControlFactors {
  const f: ControlFactors = {
    speed: new Map(),
    scale: new Map(),
    count: new Map(),
    hidden: new Set(),
  };
  for (const control of script.controls) {
    const value = values?.[control.id] ?? control.default;
    const factor = control.default !== 0 ? value / control.default : value;
    for (const bind of control.binds) {
      switch (bind.property) {
        case "speed":
          f.speed.set(bind.actor, (f.speed.get(bind.actor) ?? 1) * factor);
          break;
        case "scale":
          f.scale.set(bind.actor, (f.scale.get(bind.actor) ?? 1) * factor);
          break;
        case "count":
          f.count.set(bind.actor, (f.count.get(bind.actor) ?? 1) * factor);
          break;
        case "visible":
          if (value < 0.5) f.hidden.add(bind.actor);
          break;
      }
    }
  }
  return f;
}

export function computeState(
  script: Script,
  sceneIndex: number,
  t: number,
  controls?: ControlValues,
): SceneState {
  const scene: Scene | undefined = script.scenes[sceneIndex];
  if (!scene) {
    throw new RangeError(`scene ${sceneIndex} out of range (0..${script.scenes.length - 1})`);
  }
  const time = Math.min(Math.max(0, t), scene.duration);
  const factors = controlFactors(script, controls);

  // Steps in time order (stable for equal t).
  const steps = [...scene.steps].sort((a, b) => a.t - b.t);

  const shownActors = new Set<string>();
  for (const s of steps) if (s.action === "show") shownActors.add(s.actor);

  const actors: Record<string, ActorState> = {};
  for (const actor of script.actors) {
    const startsHidden = actor.hidden || shownActors.has(actor.id);
    actors[actor.id] = {
      x: actor.x,
      y: actor.y,
      z: actor.z,
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      opacity: startsHidden ? 0 : 1,
      color: resolveColor(actor.color),
      label: actor.label,
      highlight: 0,
      visible: !startsHidden,
    };
  }

  const baseSize = new Map(script.actors.map((a) => [a.id, a.size]));

  let camera: CameraState = {
    x: script.camera.x,
    y: script.camera.y,
    z: script.camera.z,
    look: { ...script.camera.look },
  };
  const flows: FlowParticleState[] = [];

  const actorOf = (id: string): ActorState | undefined => actors[id];

  for (const step of steps) {
    if (step.t > time) break;
    const p = progressOf(time, step.t, step.dur);
    applyStep(step, p);
  }

  function applyStep(step: Step, p: number): void {
    switch (step.action) {
      case "show": {
        const a = actorOf(step.actor);
        if (!a) return;
        a.opacity = Math.max(a.opacity, easeInOut(p));
        a.visible = true;
        return;
      }
      case "hide": {
        const a = actorOf(step.actor);
        if (!a) return;
        a.opacity = Math.min(a.opacity, 1 - easeInOut(p));
        if (p >= 1) a.visible = false;
        return;
      }
      case "move": {
        const a = actorOf(step.actor);
        if (!a) return;
        const e = easeInOut(p);
        a.x = a.x + (step.to.x - a.x) * e;
        a.y = a.y + (step.to.y - a.y) * e;
        a.z = a.z + (step.to.z - a.z) * e;
        return;
      }
      case "grow": {
        const a = actorOf(step.actor);
        if (!a) return;
        const base = baseSize.get(step.actor) ?? 2;
        const target = step.to / base;
        a.scale = a.scale + (target - a.scale) * easeInOut(p);
        return;
      }
      case "pulse": {
        const a = actorOf(step.actor);
        if (!a || p >= 1 || p <= 0) return;
        const wave = Math.abs(Math.sin(step.times * Math.PI * p));
        a.scale *= 1 + (step.scale - 1) * wave;
        return;
      }
      case "rotate": {
        const a = actorOf(step.actor);
        if (!a) return;
        const speed = factors.speed.get(step.actor) ?? 1;
        const angle = step.turns * speed * 2 * Math.PI * p;
        a.rotation[step.axis] += angle;
        return;
      }
      case "highlight": {
        const a = actorOf(step.actor);
        if (!a || p <= 0 || p >= 1) return;
        const edge = Math.min(1, Math.min(p, 1 - p) / 0.15);
        a.highlight = Math.max(a.highlight, edge);
        return;
      }
      case "shake": {
        const a = actorOf(step.actor);
        if (!a || p <= 0 || p >= 1) return;
        a.x += Math.sin(p * Math.PI * 8) * step.amplitude * (1 - p);
        return;
      }
      case "label": {
        const a = actorOf(step.actor);
        if (!a || p <= 0) return;
        a.label = step.text;
        return;
      }
      case "count": {
        const a = actorOf(step.actor);
        if (!a || p <= 0) return;
        const value = step.from + (step.to - step.from) * easeInOut(p);
        const rounded = Number.isInteger(step.from) && Number.isInteger(step.to)
          ? Math.round(value)
          : Math.round(value * 10) / 10;
        a.labelValue = `${step.prefix}${rounded}${step.suffix}`;
        return;
      }
      case "color": {
        const a = actorOf(step.actor);
        if (!a) return;
        a.color = hexLerp(a.color, resolveColor(step.to), easeInOut(p));
        return;
      }
      case "flow": {
        if (p <= 0 || p >= 1) return;
        const from = actorOf(step.from);
        const to = actorOf(step.to);
        if (!from || !to) return;
        const countFactor = factors.count.get(step.from) ?? 1;
        const n = Math.max(1, Math.round(step.count * countFactor));
        const travel = 0.4; // fraction of the flow window each particle travels
        const color = resolveColor(step.color);
        for (let i = 0; i < n; i++) {
          const start = (i / n) * (1 - travel);
          const lp = (p - start) / travel;
          if (lp <= 0 || lp >= 1) continue;
          const e = easeInOut(lp);
          const x = from.x + (to.x - from.x) * e;
          const z = from.z + (to.z - from.z) * e;
          const lift = Math.sin(lp * Math.PI) * 1.2;
          const y = from.y + (to.y - from.y) * e + 1 + lift;
          flows.push({ x, y, z, shape: step.shape, color, progress: lp });
        }
        return;
      }
      case "camera": {
        const e = easeInOut(p);
        camera = {
          x: camera.x + (step.to.x - camera.x) * e,
          y: camera.y + (step.to.y - camera.y) * e,
          z: camera.z + (step.to.z - camera.z) * e,
          look: {
            x: camera.look.x + (step.look.x - camera.look.x) * e,
            y: camera.look.y + (step.look.y - camera.look.y) * e,
            z: camera.look.z + (step.look.z - camera.look.z) * e,
          },
        };
        return;
      }
    }
  }

  // Apply control scale/visibility on top.
  for (const [id, a] of Object.entries(actors)) {
    const sf = factors.scale.get(id);
    if (sf !== undefined) a.scale *= sf;
    if (factors.hidden.has(id)) {
      a.opacity = 0;
      a.visible = false;
    }
  }

  let narrationIndex = -1;
  scene.narration.forEach((n, i) => {
    if (n.t <= time) narrationIndex = i;
  });

  return { actors, camera, flows, narrationIndex };
}
