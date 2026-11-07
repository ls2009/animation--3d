/**
 * Per-action unit tests for computeState: each step action is checked at
 * t=0 (before/at start), mid-step, and end (after completion), per the
 * mission contract (position, opacity, rotation, label).
 */
import { describe, expect, it } from "vitest";
import { ScriptSchema, type Script } from "@sinaa/dsl";
import { computeState } from "../src/index";

function script(steps: unknown[], extra: Partial<Record<string, unknown>> = {}): Script {
  return ScriptSchema.parse({
    version: "1.0",
    title: "T",
    language: "en",
    camera: { x: 10, y: 10, z: 20, look: { x: 0, y: 0, z: 0 } },
    actors: [
      { id: "a1", prop: "piston", label: "Piston", color: "a", x: 0, y: 0, z: 0, size: 2 },
      { id: "a2", prop: "gear", label: "Gear", color: "b", x: 8, y: 0, z: 0, size: 4 },
    ],
    scenes: [
      {
        title: "S",
        duration: 20,
        beat: "b",
        narration: [
          { t: 0, text: "first" },
          { t: 10, text: "second" },
        ],
        steps,
      },
    ],
    ...extra,
  });
}

describe("computeState — scene basics", () => {
  it("returns base state at t=0 with no steps", () => {
    const st = computeState(script([]), 0, 0);
    expect(st.actors.a1).toMatchObject({ x: 0, y: 0, z: 0, scale: 1, opacity: 1, visible: true });
    expect(st.actors.a1!.color).toBe("#4f8ef7"); // palette a
    expect(st.camera).toMatchObject({ x: 10, y: 10, z: 20 });
  });

  it("throws RangeError on out-of-range scene index", () => {
    expect(() => computeState(script([]), 5, 0)).toThrow(RangeError);
  });

  it("narrationIndex tracks the active segment", () => {
    const s = script([]);
    expect(computeState(s, 0, 0).narrationIndex).toBe(0);
    expect(computeState(s, 0, 9.9).narrationIndex).toBe(0);
    expect(computeState(s, 0, 10).narrationIndex).toBe(1);
  });

  it("is deterministic: same inputs, identical output", () => {
    const s = script([{ action: "rotate", actor: "a2", t: 1, dur: 5, axis: "y", turns: 2 }]);
    expect(computeState(s, 0, 3.3)).toEqual(computeState(s, 0, 3.3));
  });
});

describe("move", () => {
  const s = script([{ action: "move", actor: "a1", t: 2, dur: 4, to: { x: 10, y: 6, z: -4 } }]);
  it("t=0: at base", () => {
    expect(computeState(s, 0, 0).actors.a1).toMatchObject({ x: 0, y: 0, z: 0 });
  });
  it("mid: between base and target", () => {
    const a = computeState(s, 0, 4).actors.a1!; // halfway, eased => exactly half
    expect(a.x).toBeCloseTo(5, 5);
    expect(a.y).toBeCloseTo(3, 5);
    expect(a.z).toBeCloseTo(-2, 5);
  });
  it("end: exactly at target and stays", () => {
    expect(computeState(s, 0, 6).actors.a1).toMatchObject({ x: 10, y: 6, z: -4 });
    expect(computeState(s, 0, 15).actors.a1).toMatchObject({ x: 10, y: 6, z: -4 });
  });
});

describe("show / hide", () => {
  const s = script([
    { action: "show", actor: "a1", t: 2, dur: 2 },
    { action: "hide", actor: "a2", t: 5, dur: 2 },
  ]);
  it("t=0: shown-later actor starts hidden; other visible", () => {
    const st = computeState(s, 0, 0);
    expect(st.actors.a1!.opacity).toBe(0);
    expect(st.actors.a1!.visible).toBe(false);
    expect(st.actors.a2!.opacity).toBe(1);
  });
  it("mid: fading", () => {
    const st = computeState(s, 0, 3);
    expect(st.actors.a1!.opacity).toBeCloseTo(0.5, 5);
    const st6 = computeState(s, 0, 6);
    expect(st6.actors.a2!.opacity).toBeCloseTo(0.5, 5);
  });
  it("end: fully shown / fully hidden", () => {
    const st = computeState(s, 0, 8);
    expect(st.actors.a1!.opacity).toBe(1);
    expect(st.actors.a2!.opacity).toBe(0);
    expect(st.actors.a2!.visible).toBe(false);
  });
});

describe("grow", () => {
  const s = script([{ action: "grow", actor: "a1", t: 0, dur: 4, to: 6 }]); // base size 2 -> scale 3
  it("t=0: scale 1", () => {
    expect(computeState(s, 0, 0).actors.a1!.scale).toBe(1);
  });
  it("mid: scale 2 at halfway (eased midpoint)", () => {
    expect(computeState(s, 0, 2).actors.a1!.scale).toBeCloseTo(2, 5);
  });
  it("end: scale 3, sticks", () => {
    expect(computeState(s, 0, 4).actors.a1!.scale).toBeCloseTo(3, 5);
    expect(computeState(s, 0, 10).actors.a1!.scale).toBeCloseTo(3, 5);
  });
});

describe("rotate", () => {
  const s = script([{ action: "rotate", actor: "a2", t: 0, dur: 10, axis: "y", turns: 2 }]);
  it("t=0: no rotation", () => {
    expect(computeState(s, 0, 0).actors.a2!.rotation.y).toBe(0);
  });
  it("mid: half of 2 turns = 2π", () => {
    expect(computeState(s, 0, 5).actors.a2!.rotation.y).toBeCloseTo(2 * Math.PI, 5);
  });
  it("end: 4π and sticks", () => {
    expect(computeState(s, 0, 10).actors.a2!.rotation.y).toBeCloseTo(4 * Math.PI, 5);
    expect(computeState(s, 0, 15).actors.a2!.rotation.y).toBeCloseTo(4 * Math.PI, 5);
  });
  it("speed control multiplies turns", () => {
    const sc = script(
      [{ action: "rotate", actor: "a2", t: 0, dur: 10, axis: "y", turns: 2 }],
      {
        controls: [
          { id: "spd", label: "Speed", min: 0, max: 20, default: 10, binds: [{ actor: "a2", property: "speed" }] },
        ],
      },
    );
    const st = computeState(sc, 0, 5, { spd: 20 }); // 2x default
    expect(st.actors.a2!.rotation.y).toBeCloseTo(4 * Math.PI, 5);
  });
});

describe("pulse", () => {
  const s = script([{ action: "pulse", actor: "a1", t: 2, dur: 4, scale: 1.5, times: 1 }]);
  it("t=0 and end: scale back to 1", () => {
    expect(computeState(s, 0, 0).actors.a1!.scale).toBe(1);
    expect(computeState(s, 0, 6.01).actors.a1!.scale).toBe(1);
  });
  it("mid: at the peak of a single pulse", () => {
    expect(computeState(s, 0, 4).actors.a1!.scale).toBeCloseTo(1.5, 3);
  });
});

describe("highlight", () => {
  const s = script([{ action: "highlight", actor: "a1", t: 2, dur: 4 }]);
  it("t=0: none; mid: full; end: none", () => {
    expect(computeState(s, 0, 0).actors.a1!.highlight).toBe(0);
    expect(computeState(s, 0, 4).actors.a1!.highlight).toBe(1);
    expect(computeState(s, 0, 6.5).actors.a1!.highlight).toBe(0);
  });
});

describe("shake", () => {
  const s = script([{ action: "shake", actor: "a1", t: 2, dur: 2, amplitude: 1 }]);
  it("t=0 and end: at base x; mid: displaced", () => {
    expect(computeState(s, 0, 0).actors.a1!.x).toBe(0);
    const mid = computeState(s, 0, 3.1).actors.a1!.x;
    expect(Math.abs(mid)).toBeGreaterThan(0.01);
    expect(computeState(s, 0, 4.5).actors.a1!.x).toBe(0);
  });
});

describe("label", () => {
  const s = script([{ action: "label", actor: "a1", t: 5, text: "Renamed" }]);
  it("before: original; at/after: new text", () => {
    expect(computeState(s, 0, 4.9).actors.a1!.label).toBe("Piston");
    expect(computeState(s, 0, 5.5).actors.a1!.label).toBe("Renamed");
    expect(computeState(s, 0, 20).actors.a1!.label).toBe("Renamed");
  });
});

describe("count", () => {
  const s = script([{ action: "count", actor: "a1", t: 0, dur: 10, from: 0, to: 100, suffix: "%" }]);
  it("t=0: not yet set; mid: interpolated; end: final", () => {
    expect(computeState(s, 0, 0).actors.a1!.labelValue).toBeUndefined();
    expect(computeState(s, 0, 5).actors.a1!.labelValue).toBe("50%");
    expect(computeState(s, 0, 10).actors.a1!.labelValue).toBe("100%");
  });
});

describe("color", () => {
  const s = script([{ action: "color", actor: "a1", t: 0, dur: 4, to: "#000000" }]);
  it("t=0: palette a; mid: between; end: black, sticks", () => {
    expect(computeState(s, 0, 0).actors.a1!.color).toBe("#4f8ef7");
    const mid = computeState(s, 0, 2).actors.a1!.color;
    expect(mid).not.toBe("#4f8ef7");
    expect(mid).not.toBe("#000000");
    expect(computeState(s, 0, 4).actors.a1!.color).toBe("#000000");
    expect(computeState(s, 0, 12).actors.a1!.color).toBe("#000000");
  });
});

describe("flow", () => {
  const s = script([{ action: "flow", from: "a1", to: "a2", t: 2, dur: 8, count: 6, shape: "cube", color: "c" }]);
  it("t=0 and after end: no particles", () => {
    expect(computeState(s, 0, 0).flows).toHaveLength(0);
    expect(computeState(s, 0, 11).flows).toHaveLength(0);
  });
  it("mid: particles exist between the endpoints", () => {
    const flows = computeState(s, 0, 6).flows;
    expect(flows.length).toBeGreaterThan(0);
    for (const f of flows) {
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x).toBeLessThanOrEqual(8);
      expect(f.shape).toBe("cube");
      expect(f.color).toBe("#f7b84f");
    }
  });
  it("count control multiplies particle count", () => {
    const sc = script(
      [{ action: "flow", from: "a1", to: "a2", t: 0, dur: 10, count: 10, shape: "sphere", color: "c" }],
      {
        controls: [
          { id: "n", label: "N", min: 1, max: 30, default: 10, binds: [{ actor: "a1", property: "count" }] },
        ],
      },
    );
    const low = computeState(sc, 0, 5, { n: 5 }).flows.length;
    const high = computeState(sc, 0, 5, { n: 30 }).flows.length;
    expect(high).toBeGreaterThan(low);
  });
});

describe("camera step", () => {
  const s = script([
    { action: "camera", t: 0, dur: 10, to: { x: 0, y: 20, z: 0 }, look: { x: 1, y: 2, z: 3 } },
  ]);
  it("t=0: scripted start; mid: between; end: at target", () => {
    expect(computeState(s, 0, 0).camera).toMatchObject({ x: 10, y: 10, z: 20 });
    const mid = computeState(s, 0, 5).camera;
    expect(mid.x).toBeCloseTo(5, 5);
    expect(mid.y).toBeCloseTo(15, 5);
    const end = computeState(s, 0, 10).camera;
    expect(end).toMatchObject({ x: 0, y: 20, z: 0 });
    expect(end.look).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe("visible / scale controls", () => {
  it("visible control hides the bound actor below 0.5", () => {
    const sc = script([], {
      controls: [
        { id: "v", label: "V", min: 0, max: 1, default: 1, binds: [{ actor: "a1", property: "visible" }] },
      ],
    });
    expect(computeState(sc, 0, 1, { v: 0 }).actors.a1!.visible).toBe(false);
    expect(computeState(sc, 0, 1, { v: 1 }).actors.a1!.visible).toBe(true);
  });
  it("scale control multiplies actor scale", () => {
    const sc = script([], {
      controls: [
        { id: "s", label: "S", min: 1, max: 4, default: 2, binds: [{ actor: "a1", property: "scale" }] },
      ],
    });
    expect(computeState(sc, 0, 1, { s: 4 }).actors.a1!.scale).toBeCloseTo(2, 5);
  });
});
