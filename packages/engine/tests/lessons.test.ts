import { describe, expect, it } from "vitest";
import { BUILTIN_LESSONS, validateScript } from "../src/index";

describe("built-in lessons", () => {
  it("there are three", () => {
    expect(BUILTIN_LESSONS).toHaveLength(3);
  });

  for (const lesson of [0, 1, 2]) {
    it(`lesson ${lesson} validates with ZERO repairs`, () => {
      const r = validateScript(JSON.parse(JSON.stringify(BUILTIN_LESSONS[lesson]!)));
      expect(r.warnings).toEqual([]);
      expect(r.stats.repairCount).toBe(0);
    });
  }

  it("each lesson has beats, keyFacts, narration and 3 checks", () => {
    for (const lesson of BUILTIN_LESSONS) {
      expect(lesson.checks).toHaveLength(3);
      expect(lesson.controls.length).toBeGreaterThan(0);
      for (const scene of lesson.scenes) {
        expect(scene.beat.length).toBeGreaterThan(10);
        expect(scene.keyFact.length).toBeGreaterThan(5);
        expect(scene.narration.length).toBeGreaterThanOrEqual(2);
        expect(scene.duration).toBeGreaterThanOrEqual(8);
        expect(scene.duration).toBeLessThanOrEqual(14);
        // Visible motion within 2s of scene start (choreographer hard rule).
        expect(Math.min(...scene.steps.map((s) => s.t))).toBeLessThanOrEqual(2);
      }
    }
  });
});
