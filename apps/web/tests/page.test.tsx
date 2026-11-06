import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../app/page";

describe("landing page", () => {
  it("renders the project name", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Sinaa Motion Lab" }),
    ).toBeDefined();
  });
});
