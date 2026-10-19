// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LoadingState from "../extension/src/LoadingState.jsx";

afterEach(() => {
  cleanup();
});

describe("extension loading status", () => {
  it("announces the label and hides the ticking timer", () => {
    render(<LoadingState active label="Loading groups" />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading groups");
    expect(status.className).toContain("loading-state-label");

    const elapsed = document.querySelector(".loading-state-elapsed");
    expect(elapsed).toHaveAttribute("aria-hidden", "true");
    expect(elapsed?.textContent).toMatch(/s$/);
    expect(status.contains(elapsed)).toBe(false);
  });

  it("marks a finished save and a saved note as status in the overlay", () => {
    const overlay = readFileSync("extension/src/overlay.jsx", "utf8");
    expect(overlay).toContain('className="saved-text" role="status"');
    expect(overlay).toContain('className="assign-note" role="status"');
    expect(overlay).toContain("Note saved");
  });
});
