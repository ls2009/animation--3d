import { describe, expect, it } from "vitest";
import { GOLDEN_SET_PLANNED_TOPICS } from "../src/index";

describe("@sinaa/golden", () => {
  it("plans 12 subjects x 3 audiences", () => {
    expect(GOLDEN_SET_PLANNED_TOPICS).toBe(36);
  });
});
