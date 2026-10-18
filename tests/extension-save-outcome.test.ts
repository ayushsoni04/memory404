import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classifyLinkSave,
  saveHeadline,
  saveJobSettled,
} from "../extension/src/save-outcome.js";

describe("extension save outcome", () => {
  it("treats a 409 as an existing link, including one in Trash", () => {
    expect(
      classifyLinkSave(409, {
        error: "This URL is in Trash. Restore it to save it again.",
        existingId: "link-1",
        link: { id: "link-1" },
      }),
    ).toEqual({
      kind: "duplicate",
      link: { id: "link-1" },
      message: "This URL is in Trash. Restore it to save it again.",
    });
    expect(classifyLinkSave(409, { existingId: "link-2" }).kind).toBe("duplicate");
    expect(classifyLinkSave(201, { link: { id: "new" } }).kind).toBe("saved");
    expect(classifyLinkSave(500, { error: "Failed to save" })).toMatchObject({
      kind: "error",
      message: "Couldn't save this page. Try again.",
    });
    expect(classifyLinkSave(500, {}).message).toBe("Couldn't save this page. Try again.");
    expect(classifyLinkSave(409, { existingId: "link-3" }).message).toBe(
      "This page is already saved.",
    );
  });

  it("does not describe a duplicate as a new save or offer a note", () => {
    expect(
      saveHeadline({
        total: 1,
        saved: 0,
        already: 1,
        duplicateMessage: "A link with this URL already exists.",
      }),
    ).toEqual({
      title: "Already in memory404",
      detail: "A link with this URL already exists.",
      offerNote: false,
    });
    expect(
      saveHeadline({ total: 1, saved: 0, already: 1 }),
    ).toMatchObject({ detail: "This page is already saved.", offerNote: false });
    expect(
      saveHeadline({ total: 1, saved: 1, already: 0 }),
    ).toMatchObject({ title: "Saved to memory404", offerNote: true });
    expect(
      saveHeadline({ total: 3, saved: 1, already: 1, failed: 1 }),
    ).toEqual({
      title: "Saved 1 of 3",
      detail: "1 already saved · 1 failed",
      offerNote: false,
    });
  });

  it("does not call a skipped page a successful save", () => {
    expect(saveHeadline({ total: 1, saved: 0, skipped: 1 })).toEqual({
      title: "Nothing was saved",
      detail: "This page can't be saved.",
      offerNote: false,
    });
    expect(saveHeadline({ total: 4, saved: 0, skipped: 4 })).toEqual({
      title: "Nothing was saved",
      detail: "4 pages were skipped.",
      offerNote: false,
    });
    expect(saveHeadline({ total: 3, saved: 0, already: 1, skipped: 2 })).toEqual({
      title: "Nothing new was saved",
      detail: "1 already saved · 2 skipped",
      offerNote: false,
    });
    expect(saveJobSettled({ saved: 0, skipped: 1 })).toEqual({
      status: "saved",
      badge: "",
    });
    expect(saveJobSettled({ saved: 0, failed: 1 })).toEqual({
      status: "error",
      badge: "!",
    });
    expect(saveJobSettled({ saved: 2, skipped: 1 })).toEqual({
      status: "saved",
      badge: "✓",
    });
  });

  it("keeps the service worker on the same duplicate outcome", () => {
    const source = readFileSync(
      "extension/public/static/background.js",
      "utf8",
    );
    expect(source).toContain("classifyLinkSave");
    expect(source).toContain("saveJobSettled");
    expect(source).toContain('status: "already"');
  });
});
