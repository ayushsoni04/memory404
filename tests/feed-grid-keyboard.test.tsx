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

  it("moves into the next column when the cards are side by side", () => {
    render(
      <FeedGrid gridSize="default">
        <button type="button" data-feed-card="">
          Top left
        </button>
        <button type="button" data-feed-card="">
          Bottom left
        </button>
        <button type="button" data-feed-card="">
          Top right
        </button>
        <button type="button" data-feed-card="">
          Bottom right
        </button>
      </FeedGrid>,
    );

    const boxes = [
      { left: 0, top: 0, width: 100, height: 80 },
      { left: 0, top: 96, width: 100, height: 80 },
      { left: 128, top: 0, width: 100, height: 80 },
      { left: 128, top: 96, width: 100, height: 80 },
    ];
    const cards = [
      screen.getByRole("button", { name: "Top left" }),
      screen.getByRole("button", { name: "Bottom left" }),
      screen.getByRole("button", { name: "Top right" }),
      screen.getByRole("button", { name: "Bottom right" }),
    ];
    cards.forEach((card, index) => {
      const box = boxes[index];
      card.getBoundingClientRect = () =>
        ({
          ...box,
          right: box.left + box.width,
          bottom: box.top + box.height,
          x: box.left,
          y: box.top,
          toJSON: () => ({}),
        }) as DOMRect;
    });

    cards[0].focus();
    fireEvent.keyDown(cards[0], { key: "ArrowRight" });
    expect(cards[2]).toHaveFocus();
    fireEvent.keyDown(cards[2], { key: "ArrowDown" });
    expect(cards[3]).toHaveFocus();
    fireEvent.keyDown(cards[3], { key: "ArrowDown" });
    expect(cards[3]).toHaveFocus();
    fireEvent.keyDown(cards[3], { key: "ArrowLeft" });
    expect(cards[1]).toHaveFocus();
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
    expect(screen.getByRole("option", { name: "Site" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Domain" })).not.toBeInTheDocument();
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
