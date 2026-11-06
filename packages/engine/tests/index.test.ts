import { describe, expect, it } from "vitest";
import { ENGINE_DSL_VERSION } from "../src/index";

describe("@sinaa/engine", () => {
  it("targets the shared DSL version", () => {
    expect(ENGINE_DSL_VERSION).toBe("1.0");
  });
});
