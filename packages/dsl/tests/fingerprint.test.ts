import { describe, expect, it } from "vitest";
import { computeFingerprint, normalizeTopic } from "../src/fingerprint";

const base = {
  topic: "The Four-Stroke Engine",
  audience: "curious teens",
  language: "en",
  propLibraryVersion: "1.0.0",
  promptVersion: "single-pass@1",
};

describe("computeFingerprint", () => {
  it("is stable: pinned test vector must never change", () => {
    // If this vector changes, every cached lesson is invalidated — bump
    // deliberately, never accidentally.
    expect(computeFingerprint(base)).toBe(
      "50c9c5d57788328027cbb255248229830c4fbe208d363e68567042e04244c5a5",
    );
  });

  it("normalizes topic case and whitespace", () => {
    expect(computeFingerprint({ ...base, topic: "  the four-stroke   ENGINE " })).toBe(
      computeFingerprint(base),
    );
  });

  it("changes when any ingredient changes", () => {
    const fp = computeFingerprint(base);
    expect(computeFingerprint({ ...base, language: "fr" })).not.toBe(fp);
    expect(computeFingerprint({ ...base, audience: "engineers" })).not.toBe(fp);
    expect(computeFingerprint({ ...base, propLibraryVersion: "1.0.1" })).not.toBe(fp);
    expect(computeFingerprint({ ...base, promptVersion: "single-pass@2" })).not.toBe(fp);
    expect(computeFingerprint({ ...base, topic: "turbocharger" })).not.toBe(fp);
  });
});

describe("normalizeTopic", () => {
  it("lower-cases, trims and collapses whitespace", () => {
    expect(normalizeTopic("  How   DNS\tWorks ")).toBe("how dns works");
  });
});
