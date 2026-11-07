/**
 * Mission test: the engine lesson yields 6 PNGs with non-uniform pixels.
 * Runs the Playwright backend (always available); the gl backend has its own
 * test that skips when no GL context can be created in the environment.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BUILTIN_LESSONS } from "@sinaa/engine";
import { renderKeyframes } from "../src/index";

const engineLesson = BUILTIN_LESSONS[0]!; // four-stroke engine, 6 scenes

function assertKeyframes(pngs: Buffer[]): void {
  expect(pngs).toHaveLength(6);
  const hashes = new Set<string>();
  for (const png of pngs) {
    // Real content, not a header-only or flat image.
    expect(png.length).toBeGreaterThan(10_000);
    // Non-uniform pixels: a solid-colour PNG compresses tiny and has low
    // byte diversity; sampled diversity must be high.
    const diversity = new Set(png.subarray(0, 50_000)).size;
    expect(diversity).toBeGreaterThan(64);
    hashes.add(createHash("sha256").update(png).digest("hex"));
  }
  // Every scene looks different from every other.
  expect(hashes.size).toBe(6);
}

describe("keyframes", () => {
  it("playwright backend: engine lesson -> 6 non-uniform, distinct PNGs", async () => {
    const result = await renderKeyframes(engineLesson, { backend: "playwright" });
    expect(result.backend).toBe("playwright");
    assertKeyframes(result.pngs);
  }, 180_000);

  it("playwright backend is deterministic across runs", async () => {
    const a = await renderKeyframes(engineLesson, { backend: "playwright" });
    const b = await renderKeyframes(engineLesson, { backend: "playwright" });
    const h = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
    expect(a.pngs.map(h)).toEqual(b.pngs.map(h));
  }, 300_000);

  it("gl backend: same contract (skips where no GL context exists)", async () => {
    let glWorks = false;
    try {
      const mod = (await import("gl")) as unknown as {
        default?: (w: number, h: number) => unknown;
      } & ((w: number, h: number) => unknown);
      const factory = (mod.default ?? mod) as (w: number, h: number) => unknown;
      glWorks = factory(4, 4) !== null;
    } catch {
      glWorks = false;
    }
    if (!glWorks) {
      console.warn("gl backend test skipped: no GL context in this environment");
      return;
    }
    const result = await renderKeyframes(engineLesson, { backend: "gl" });
    expect(result.backend).toBe("gl");
    assertKeyframes(result.pngs);
  }, 180_000);
});
