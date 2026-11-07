import { describe, expect, it } from "vitest";
import {
  ActorSchema,
  CheckSchema,
  ControlSchema,
  DSL_VERSION,
  LIMITS,
  ScriptSchema,
  STEP_ACTIONS,
  StepSchema,
  resolveColor,
  PALETTE,
} from "../src/index";

const exampleScript = {
  version: "1.0",
  title: "The four-stroke engine",
  language: "en",
  camera: { x: 14, y: 12, z: 30, look: { x: 0, y: 6, z: 0 } },
  actors: [
    {
      id: "pis",
      kind: "prop",
      prop: "piston",
      label: "Piston",
      color: "f",
      x: 0,
      y: 0.5,
      z: 0,
      size: 5,
      hidden: false,
    },
  ],
  scenes: [
    {
      title: "Stroke 1: Intake",
      duration: 11,
      backdrop: "lab",
      beat: "Intake valve opens, piston drops, mixture is drawn in",
      narration: [{ t: 0, text: "The intake valve opens…" }],
      keyFact: "Intake: valve open, piston down, cylinder fills.",
      steps: [
        { action: "move", actor: "pis", t: 1, dur: 5, to: { x: 0, y: 0.5, z: 0 } },
      ],
    },
  ],
  controls: [
    {
      id: "rpm",
      label: "Engine speed",
      min: 500,
      max: 6000,
      default: 3000,
      binds: [{ actor: "crank", property: "speed" }],
    },
  ],
  checks: [
    {
      question: "What happens during intake?",
      options: ["Valve closes", "Piston rises", "Mixture is drawn in"],
      answer: 2,
      explain: "The descending piston draws the mixture in.",
    },
  ],
};

describe("ScriptSchema", () => {
  it("accepts the mission's example script shape", () => {
    const parsed = ScriptSchema.parse(exampleScript);
    expect(parsed.version).toBe(DSL_VERSION);
    expect(parsed.scenes[0]?.beat).toContain("Intake valve");
  });

  it("rejects a script with no scenes", () => {
    expect(() =>
      ScriptSchema.parse({ ...exampleScript, scenes: [] }),
    ).toThrow();
  });

  it("scripts without controls are valid", () => {
    const rest: Record<string, unknown> = { ...exampleScript };
    delete rest.controls;
    const parsed = ScriptSchema.parse(rest);
    expect(parsed.controls).toEqual([]);
  });
});

describe("StepSchema", () => {
  it("covers all 13 documented actions", () => {
    expect(STEP_ACTIONS).toHaveLength(13);
  });

  it("parses every action kind", () => {
    const steps = [
      { action: "show", actor: "a1", t: 0 },
      { action: "hide", actor: "a1", t: 0 },
      { action: "move", actor: "a1", t: 0, dur: 2, to: { x: 1, y: 2, z: 3 } },
      { action: "grow", actor: "a1", t: 0, dur: 2, to: 4 },
      { action: "pulse", actor: "a1", t: 0, dur: 2 },
      { action: "rotate", actor: "a1", t: 0, dur: 2, axis: "y", turns: 2 },
      { action: "highlight", actor: "a1", t: 0, dur: 2 },
      { action: "shake", actor: "a1", t: 0, dur: 1 },
      { action: "label", actor: "a1", t: 0, text: "Hello" },
      { action: "count", actor: "a1", t: 0, dur: 2, from: 0, to: 10 },
      { action: "color", actor: "a1", t: 0, dur: 1, to: "d" },
      { action: "flow", from: "a1", to: "a2", t: 0, dur: 3, count: 5, shape: "sphere" },
      { action: "camera", t: 0, dur: 2, to: { x: 0, y: 5, z: 20 }, look: { x: 0, y: 0, z: 0 } },
    ];
    for (const step of steps) {
      expect(StepSchema.safeParse(step).success, step.action).toBe(true);
    }
  });

  it("rejects an unknown action", () => {
    expect(StepSchema.safeParse({ action: "explode", actor: "a1", t: 0 }).success).toBe(false);
  });
});

describe("ActorSchema", () => {
  it("defaults kind, color, size and hidden", () => {
    const actor = ActorSchema.parse({ id: "cell", x: 0, y: 0, z: 0 });
    expect(actor.kind).toBe("prop");
    expect(actor.color).toBe("f");
    expect(actor.size).toBe(2);
    expect(actor.hidden).toBe(false);
  });

  it("accepts #rrggbb colors and rejects junk", () => {
    expect(ActorSchema.safeParse({ id: "a", color: "#aabbcc" }).success).toBe(true);
    expect(ActorSchema.safeParse({ id: "a", color: "chartreuse" }).success).toBe(false);
  });
});

describe("ControlSchema", () => {
  it("rejects default outside [min,max] and min>=max", () => {
    const base = { id: "c", label: "C", binds: [{ actor: "a1", property: "speed" }] };
    expect(ControlSchema.safeParse({ ...base, min: 0, max: 10, default: 11 }).success).toBe(false);
    expect(ControlSchema.safeParse({ ...base, min: 10, max: 10, default: 10 }).success).toBe(false);
    expect(ControlSchema.safeParse({ ...base, min: 0, max: 10, default: 5 }).success).toBe(true);
  });
});

describe("CheckSchema", () => {
  it("rejects answer index out of range", () => {
    expect(
      CheckSchema.safeParse({ question: "?", options: ["a", "b"], answer: 2 }).success,
    ).toBe(false);
  });
});

describe("palette", () => {
  it("resolves keys and hex literals, falls back to steel", () => {
    expect(resolveColor("a")).toBe(PALETTE.a);
    expect(resolveColor("#A1B2C3")).toBe("#a1b2c3");
    expect(resolveColor("nope")).toBe(PALETTE.f);
    expect(resolveColor(undefined)).toBe(PALETTE.f);
  });
});

describe("LIMITS", () => {
  it("matches the mission contract", () => {
    expect(LIMITS.maxActors).toBe(24);
    expect(LIMITS.maxScenes).toBe(9);
    expect(LIMITS.maxStepsPerScene).toBe(12);
    expect(LIMITS.maxChecks).toBe(6);
    expect(LIMITS.minSceneDuration).toBe(3);
    expect(LIMITS.maxSceneDuration).toBe(60);
  });
});
