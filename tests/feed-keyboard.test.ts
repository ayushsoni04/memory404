// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  isFeedArrowKey,
  isTextEntryTarget,
  nextFeedCardIndex,
  nextOptionIndex,
} from "@/components/vault/feed-keyboard";

describe("feed keyboard movement", () => {
  it("moves one card at a time and stops at the ends", () => {
    expect(nextFeedCardIndex(0, "ArrowRight", 3)).toBe(1);
    expect(nextFeedCardIndex(0, "ArrowDown", 3)).toBe(1);
    expect(nextFeedCardIndex(2, "ArrowRight", 3)).toBe(2);
    expect(nextFeedCardIndex(2, "ArrowLeft", 3)).toBe(1);
    expect(nextFeedCardIndex(0, "ArrowUp", 3)).toBe(0);
    expect(nextFeedCardIndex(1, "Home", 3)).toBe(0);
    expect(nextFeedCardIndex(1, "End", 3)).toBe(2);
  });

  it("ignores arrows when no card is focused", () => {
    expect(nextFeedCardIndex(-1, "ArrowRight", 3)).toBeNull();
    expect(isFeedArrowKey("Enter")).toBe(false);
    expect(isFeedArrowKey("ArrowLeft")).toBe(true);
  });

  it("keeps arrow keys inside text fields and selects", () => {
    const note = document.createElement("textarea");
    const menu = document.createElement("select");
    const button = document.createElement("button");
    document.body.append(note, menu, button);
    expect(isTextEntryTarget(note)).toBe(true);
    expect(isTextEntryTarget(menu)).toBe(true);
    expect(isTextEntryTarget(button)).toBe(false);
    note.remove();
    menu.remove();
    button.remove();
  });

  it("moves through a sort list without wrapping", () => {
    expect(nextOptionIndex(0, "ArrowDown", 5)).toBe(1);
    expect(nextOptionIndex(4, "ArrowDown", 5)).toBe(4);
    expect(nextOptionIndex(2, "Home", 5)).toBe(0);
    expect(nextOptionIndex(2, "End", 5)).toBe(4);
    expect(nextOptionIndex(1, "Enter", 5)).toBeNull();
  });
});
