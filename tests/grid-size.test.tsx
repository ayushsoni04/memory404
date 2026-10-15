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
  it("uses one tab stop and arrow keys to change the layout", () => {
    const setGridSizeAndPersist = vi.fn();
    const { rerender } = render(
      <GridSizeControl gridSize="default" setGridSizeAndPersist={setGridSizeAndPersist} />,
    );

    const compact = screen.getByRole("radio", { name: "Compact grid" });
    const medium = screen.getByRole("radio", { name: "Default grid" });
    const large = screen.getByRole("radio", { name: "Large grid" });
    expect(screen.getByRole("radiogroup", { name: "Grid layout" })).toBeInTheDocument();
    expect(medium).toHaveAttribute("aria-checked", "true");
    expect(medium).toHaveAttribute("tabindex", "0");
    expect(compact).toHaveAttribute("tabindex", "-1");
    expect(large).toHaveAttribute("tabindex", "-1");
    expect(medium.className).toContain("focus-visible:ring-2");

    fireEvent.keyDown(medium, { key: "ArrowRight" });
    expect(setGridSizeAndPersist).toHaveBeenCalledWith("large");
    expect(large).toHaveFocus();

    rerender(
      <GridSizeControl gridSize="large" setGridSizeAndPersist={setGridSizeAndPersist} />,
    );
    fireEvent.keyDown(screen.getByRole("radio", { name: "Large grid" }), {
      key: "ArrowRight",
    });
    expect(setGridSizeAndPersist).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(medium, { key: "Home" });
    expect(setGridSizeAndPersist).toHaveBeenCalledWith("compact");
    expect(compact).toHaveFocus();
  });
});
