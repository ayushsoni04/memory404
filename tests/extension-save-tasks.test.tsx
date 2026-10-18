import { describe, expect, it } from "vitest";
import {
  taskRowButtonName,
  taskRowStartsOpen,
  taskStatusCopy,
} from "../extension/src/SaveTaskRows.jsx";
import { BLOCKED_PAGE_MESSAGE } from "../extension/src/page-url.js";

describe("task status copy", () => {
  it("uses the skip reason instead of a bare skipped label", () => {
    expect(taskStatusCopy("skipped", BLOCKED_PAGE_MESSAGE)).toEqual({
      pill: "Can't save",
      detail: BLOCKED_PAGE_MESSAGE,
    });
    expect(taskStatusCopy("skipped", "  ")).toEqual({
      pill: "Can't save",
      detail: "This page can't be saved.",
    });
    expect(taskStatusCopy("failed", "Session expired")).toEqual({
      pill: "Failed",
      detail: "Session expired",
    });
    expect(taskStatusCopy("failed", "  ")).toEqual({
      pill: "Failed",
      detail: "Couldn't save this page.",
    });
    expect(taskStatusCopy("saved", null)).toEqual({
      pill: "Completed",
      detail: "Saved",
    });
  });

  it("names a row by the page and whether its details are open", () => {
    expect(
      taskRowButtonName({
        label: "Pricing",
        status: "failed",
        error: "Couldn't save this page.",
        open: true,
      }),
    ).toBe("Pricing. Failed. Hide details");
    expect(
      taskRowButtonName({
        label: "Notes",
        status: "saved",
        error: null,
        open: false,
      }),
    ).toBe("Notes. Completed. Show details");
  });

  it("opens a skipped row so the reason is on screen", () => {
    expect(taskRowStartsOpen("skipped")).toBe(true);
    expect(taskRowStartsOpen("saving")).toBe(true);
    expect(taskRowStartsOpen("failed")).toBe(true);
    expect(taskRowStartsOpen("already")).toBe(true);
    expect(taskRowStartsOpen("saved")).toBe(false);
    expect(taskRowStartsOpen("pending")).toBe(false);
  });
});
