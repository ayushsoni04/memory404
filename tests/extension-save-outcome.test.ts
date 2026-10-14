import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classifyLinkSave,
  saveHeadline,
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
    expect(classifyLinkSave(500, { error: "Failed to save" }).kind).toBe("error");
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

  it("keeps the service worker on the same duplicate outcome", () => {
    const source = readFileSync(
      "extension/public/static/background.js",
      "utf8",
    );
    expect(source).toContain("classifyLinkSave");
    expect(source).toContain('status: "already"');
  });
});
