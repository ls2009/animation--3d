import { describe, expect, it } from "vitest";
import { DSL_VERSION } from "../src/index";

describe("@sinaa/dsl", () => {
  it("exposes the DSL version", () => {
    expect(DSL_VERSION).toBe("1.0");
  });
});
