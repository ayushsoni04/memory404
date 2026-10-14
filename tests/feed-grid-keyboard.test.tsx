// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FeedGrid from "@/components/vault/FeedGrid";
import { SortPill } from "@/components/vault/VaultGroupToolbar";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

vi.mock("@/lib/card-vicinity-stroke", () => ({
  applyVicinityCardStrokes: vi.fn(),
  clearVicinityCardStrokes: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("feed card focus", () => {
  it("moves focus to the next card with the arrow keys", () => {
    render(
      <FeedGrid gridSize="large">
        <button type="button" data-feed-card="">
          First
        </button>
        <button type="button" data-feed-card="">
          Second
        </button>
      </FeedGrid>,
    );

    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: "ArrowLeft" });
    expect(first).toHaveFocus();
  });

  it("leaves arrow keys alone while a note field is focused", () => {
    render(
      <FeedGrid gridSize="large">
        <textarea aria-label="Notes" />
        <button type="button" data-feed-card="">
          First
        </button>
      </FeedGrid>,
    );
    const note = screen.getByRole("textbox", { name: "Notes" });
    note.focus();
    fireEvent.keyDown(note, { key: "ArrowRight" });
    expect(note).toHaveFocus();
  });
});

describe("sort menu keyboard", () => {
  it("opens with ArrowDown and moves between options", () => {
    const setSort = vi.fn();
    render(<SortPill sortBy="newest" setSortByAndPersist={setSort} />);

    const trigger = screen.getByRole("button", { name: "Sort links" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const newest = screen.getByRole("button", { name: "Newest" });
    const oldest = screen.getByRole("button", { name: "Oldest" });
    expect(newest).toHaveFocus();
    expect(newest.className).toContain("focus-visible:ring-2");
    expect(newest.querySelector("svg")).toBeTruthy();
    expect(oldest.querySelector("svg")).toBeNull();
    expect(screen.getByRole("option", { name: "Newest" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(oldest, { key: "ArrowDown" });
    expect(oldest).toHaveFocus();
    expect(screen.getByRole("option", { name: "Newest" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(oldest);
    expect(setSort).toHaveBeenCalledWith("oldest");
    expect(trigger).toHaveFocus();
  });
});
