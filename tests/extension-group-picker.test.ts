import { describe, expect, it } from "vitest";
import {
  groupPickerKeyAction,
  nextGroupHighlight,
} from "../extension/src/group-picker.js";

describe("nextGroupHighlight", () => {
  it("starts at the first group on ArrowDown and the last on ArrowUp", () => {
    expect(nextGroupHighlight(-1, "ArrowDown", 3)).toBe(0);
    expect(nextGroupHighlight(-1, "ArrowUp", 3)).toBe(2);
  });

  it("stops at the ends", () => {
    expect(nextGroupHighlight(2, "ArrowDown", 3)).toBe(2);
    expect(nextGroupHighlight(0, "ArrowUp", 3)).toBe(0);
    expect(nextGroupHighlight(1, "Home", 3)).toBe(0);
    expect(nextGroupHighlight(1, "End", 3)).toBe(2);
  });

  it("ignores other keys and an empty list", () => {
    expect(nextGroupHighlight(0, "Enter", 3)).toBeNull();
    expect(nextGroupHighlight(-1, "ArrowDown", 0)).toBeNull();
  });
});

describe("groupPickerKeyAction", () => {
  it("moves the highlight while the list is open", () => {
    expect(
      groupPickerKeyAction({
        key: "ArrowDown",
        highlight: -1,
        count: 2,
        hasExactMatch: false,
        hasQuery: false,
      }),
    ).toEqual({ type: "highlight", index: 0 });
  });

  it("picks the highlighted group on Enter", () => {
    expect(
      groupPickerKeyAction({
        key: "Enter",
        highlight: 1,
        count: 3,
        hasExactMatch: true,
        hasQuery: true,
      }),
    ).toEqual({ type: "pick", index: 1 });
  });

  it("picks an exact name, or creates the typed name, when nothing is highlighted", () => {
    expect(
      groupPickerKeyAction({
        key: "Enter",
        highlight: -1,
        count: 2,
        hasExactMatch: true,
        hasQuery: true,
      }),
    ).toEqual({ type: "pick-exact" });
    expect(
      groupPickerKeyAction({
        key: "Enter",
        highlight: -1,
        count: 0,
        hasExactMatch: false,
        hasQuery: true,
      }),
    ).toEqual({ type: "create" });
  });

  it("closes on Escape and ignores unrelated keys", () => {
    expect(
      groupPickerKeyAction({
        key: "Escape",
        highlight: 0,
        count: 2,
        hasExactMatch: false,
        hasQuery: false,
      }),
    ).toEqual({ type: "close" });
    expect(
      groupPickerKeyAction({
        key: "a",
        highlight: -1,
        count: 2,
        hasExactMatch: false,
        hasQuery: false,
      }),
    ).toEqual({ type: "noop" });
  });
});
