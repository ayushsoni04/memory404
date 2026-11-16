// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GridSizeControl } from "@/components/vault/GridSizeControl";
import { nextGridSize } from "@/components/vault/grid-size";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("nextGridSize", () => {
  it("moves between compact, default, and large and stops at the ends", () => {
    expect(nextGridSize("compact", "ArrowRight")).toBe("default");
    expect(nextGridSize("default", "ArrowDown")).toBe("large");
    expect(nextGridSize("large", "ArrowLeft")).toBe("default");
    expect(nextGridSize("default", "ArrowUp")).toBe("compact");
    expect(nextGridSize("compact", "ArrowLeft")).toBeNull();
    expect(nextGridSize("large", "ArrowRight")).toBeNull();
    expect(nextGridSize("default", "Home")).toBe("compact");
    expect(nextGridSize("default", "End")).toBe("large");
    expect(nextGridSize("compact", "Home")).toBeNull();
    expect(nextGridSize("large", "Enter")).toBeNull();
  });
});

describe("GridSizeControl", () => {
  it("is one dial that turns between S, M and L with the arrow keys", () => {
    const setGridSizeAndPersist = vi.fn();
    const { rerender } = render(
      <GridSizeControl gridSize="default" setGridSizeAndPersist={setGridSizeAndPersist} />,
    );

    const slider = screen.getByRole("slider", { name: "Grid size" });
    expect(slider).toHaveAttribute("tabindex", "0");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "2");
    expect(slider).toHaveAttribute("aria-valuenow", "1");
    expect(slider).toHaveAttribute("aria-valuetext", "Default grid");

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(setGridSizeAndPersist).toHaveBeenCalledWith("large");

    rerender(
      <GridSizeControl gridSize="large" setGridSizeAndPersist={setGridSizeAndPersist} />,
    );
    expect(slider).toHaveAttribute("aria-valuetext", "Large grid");
    setGridSizeAndPersist.mockClear();
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(setGridSizeAndPersist).not.toHaveBeenCalled();
    fireEvent.keyDown(slider, { key: "Home" });
    expect(setGridSizeAndPersist).toHaveBeenCalledWith("compact");
  });
});
