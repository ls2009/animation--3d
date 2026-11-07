import { describe, expect, it } from "vitest";
import { BadInputError, NoScenesError, validateScript } from "../src/index";

const minimal = () => ({
  version: "1.0",
  title: "T",
  language: "en",
  camera: { x: 14, y: 12, z: 30, look: { x: 0, y: 6, z: 0 } },
  actors: [
    { id: "a1", prop: "piston", label: "P", color: "a", x: 0, y: 0, z: 0, size: 2 },
    { id: "a2", prop: "gear", label: "G", color: "b", x: 5, y: 0, z: 0, size: 2 },
  ],
  scenes: [
    {
      title: "S1",
      duration: 10,
      beat: "something visible happens",
      narration: [{ t: 0, text: "hi" }],
      keyFact: "fact",
      steps: [{ action: "move", actor: "a1", t: 1, dur: 2, to: { x: 1, y: 1, z: 1 } }],
    },
  ],
  checks: [],
});

const codes = (result: ReturnType<typeof validateScript>) =>
  result.warnings.map((w) => w.code);

describe("validateScript — contract", () => {
  it("accepts a clean script with zero repairs", () => {
    const r = validateScript(minimal());
    expect(r.warnings).toEqual([]);
    expect(r.stats.repairCount).toBe(0);
    expect(r.stats.scenes).toBe(1);
  });

  it("throws BadInputError only on non-object input", () => {
    expect(() => validateScript(null)).toThrow(BadInputError);
    expect(() => validateScript("nope")).toThrow(BadInputError);
    expect(() => validateScript([1, 2])).toThrow(BadInputError);
  });

  it("throws NoScenesError when no scene survives", () => {
    const s = minimal();
    (s as Record<string, unknown>).scenes = [];
    expect(() => validateScript(s)).toThrow(NoScenesError);
    (s as Record<string, unknown>).scenes = ["garbage", 42];
    expect(() => validateScript(s)).toThrow(NoScenesError);
  });

  it("stats count repairs by code", () => {
    const s = minimal();
    s.actors[0]!.prop = "warp-drive";
    s.actors[1]!.color = "ultraviolet";
    const r = validateScript(s);
    expect(r.stats.repairCount).toBe(2);
    expect(r.stats.byCode.unknown_prop).toBe(1);
    expect(r.stats.byCode.bad_color).toBe(1);
  });
});

describe("validateScript — repair codes", () => {
  it("version_fixed on wrong/missing version", () => {
    const s = minimal();
    (s as Record<string, unknown>).version = "0.9";
    const r = validateScript(s);
    expect(codes(r)).toContain("version_fixed");
    expect(r.script.version).toBe("1.0");
  });

  it("unknown_prop replaces with block", () => {
    const s = minimal();
    s.actors[0]!.prop = "quantum-flux";
    const r = validateScript(s);
    expect(codes(r)).toContain("unknown_prop");
    expect(r.script.actors[0]!.prop).toBe("block");
  });

  it("aliased_prop resolves engine -> engine-cylinder", () => {
    const s = minimal();
    s.actors[0]!.prop = "engine";
    const r = validateScript(s);
    expect(codes(r)).toContain("aliased_prop");
    expect(r.script.actors[0]!.prop).toBe("engine-cylinder");
  });

  it("missing_actor drops steps referencing unknown actors", () => {
    const s = minimal();
    s.scenes[0]!.steps.push({ action: "move", actor: "ghost", t: 1, dur: 1, to: { x: 0, y: 0, z: 0 } });
    const r = validateScript(s);
    expect(codes(r)).toContain("missing_actor");
    expect(r.script.scenes[0]!.steps).toHaveLength(1);
  });

  it("bad_step drops unknown actions and malformed steps", () => {
    const s = minimal();
    const steps = s.scenes[0]!.steps as unknown[];
    steps.push({ action: "explode", actor: "a1", t: 0 });
    steps.push({ action: "label", actor: "a1", t: 0 }); // label without text
    steps.push("not a step");
    const r = validateScript(s);
    expect(codes(r).filter((c) => c === "bad_step")).toHaveLength(3);
    expect(r.script.scenes[0]!.steps).toHaveLength(1);
  });

  it("clamped_coord clamps actor positions to +-40 / -5..30 / +-30", () => {
    const s = minimal();
    s.actors[0]!.x = 999;
    s.actors[0]!.y = -50;
    s.actors[0]!.z = -31;
    const r = validateScript(s);
    expect(codes(r)).toContain("clamped_coord");
    expect(r.script.actors[0]!.x).toBe(40);
    expect(r.script.actors[0]!.y).toBe(-5);
    expect(r.script.actors[0]!.z).toBe(-30);
  });

  it("clamped_duration clamps scenes to 3..60s", () => {
    const s = minimal();
    s.scenes[0]!.duration = 500;
    const r = validateScript(s);
    expect(codes(r)).toContain("clamped_duration");
    expect(r.script.scenes[0]!.duration).toBe(60);
  });

  it("clamped_step_time pulls steps inside the scene", () => {
    const s = minimal();
    s.scenes[0]!.steps[0]!.t = 99;
    const r = validateScript(s);
    expect(codes(r)).toContain("clamped_step_time");
    expect(r.script.scenes[0]!.steps[0]!.t).toBe(10);
  });

  it("dropped_check drops malformed checks and over-limit checks", () => {
    const s = minimal();
    (s as Record<string, unknown>).checks = [
      { question: "ok?", options: ["a", "b"], answer: 0, explain: "" },
      { question: "bad", options: ["only-one"], answer: 0 },
      { question: "bad2", options: ["a", "b"], answer: 9 },
    ];
    const r = validateScript(s);
    expect(codes(r).filter((c) => c === "dropped_check")).toHaveLength(2);
    expect(r.script.checks).toHaveLength(1);
  });

  it("too_many_actors / too_many_scenes / too_many_steps enforce limits", () => {
    const s = minimal();
    for (let i = 0; i < 30; i++) {
      s.actors.push({ id: `x${i}`, prop: "block", label: "", color: "f", x: 0, y: 0, z: 0, size: 1 });
    }
    for (let i = 0; i < 10; i++) {
      s.scenes.push({ ...s.scenes[0]!, title: `S${i + 2}`, steps: [] });
    }
    for (let i = 0; i < 15; i++) {
      s.scenes[0]!.steps.push({ action: "move", actor: "a1", t: 1, dur: 1, to: { x: 0, y: 0, z: 0 } });
    }
    const r = validateScript(s);
    expect(r.script.actors).toHaveLength(24);
    expect(r.script.scenes).toHaveLength(9);
    expect(r.script.scenes[0]!.steps).toHaveLength(12);
    expect(codes(r)).toContain("too_many_actors");
    expect(codes(r)).toContain("too_many_scenes");
    expect(codes(r)).toContain("too_many_steps");
  });

  it("missing_beat warns but keeps the scene", () => {
    const s = minimal();
    s.scenes[0]!.beat = "";
    const r = validateScript(s);
    expect(codes(r)).toContain("missing_beat");
    expect(r.script.scenes).toHaveLength(1);
  });

  it("bad_control drops controls with bad binds, clamped_control fixes default", () => {
    const s = minimal();
    (s as Record<string, unknown>).controls = [
      { id: "good", label: "G", min: 0, max: 10, default: 99, binds: [{ actor: "a1", property: "speed" }] },
      { id: "bad", label: "B", min: 0, max: 10, default: 5, binds: [{ actor: "ghost", property: "speed" }] },
      { id: "worse", label: "W", min: 10, max: 0, default: 5, binds: [{ actor: "a1", property: "speed" }] },
    ];
    const r = validateScript(s);
    expect(codes(r)).toContain("clamped_control");
    expect(codes(r).filter((c) => c === "bad_control").length).toBeGreaterThanOrEqual(2);
    expect(r.script.controls).toHaveLength(1);
    expect(r.script.controls[0]!.default).toBe(10);
  });

  it("duplicate_actor drops the second copy", () => {
    const s = minimal();
    s.actors.push({ ...s.actors[0]! });
    const r = validateScript(s);
    expect(codes(r)).toContain("duplicate_actor");
    expect(r.script.actors).toHaveLength(2);
  });

  it("bad_narration drops malformed narration entries", () => {
    const s = minimal();
    (s.scenes[0]!.narration as unknown[]).push({ t: 2 }, "junk");
    const r = validateScript(s);
    expect(codes(r).filter((c) => c === "bad_narration")).toHaveLength(2);
    expect(r.script.scenes[0]!.narration).toHaveLength(1);
  });

  it("flow steps validate both endpoints", () => {
    const s = minimal();
    s.scenes[0]!.steps.push({ action: "flow", from: "a1", to: "nowhere", t: 1, dur: 2 } as never);
    const r = validateScript(s);
    expect(codes(r)).toContain("missing_actor");
    expect(r.script.scenes[0]!.steps).toHaveLength(1);
  });
});
