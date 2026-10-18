import { describe, expect, it } from "vitest";
import type { LinkApiRow } from "@/lib/links";
import {
  cacheWithLink,
  DELETE_FAILED,
  deleteFailureNotice,
  deleteUndoMessage,
  moveFailureNotice,
  moveUndoMessage,
  undoSecondsLeft,
  undoShortcutLabel,
  UNDO_MS,
} from "@/components/vault/undo-offer";

function link(id: string, groupId: string): LinkApiRow {
  return {
    id,
    url: "https://example.com/article",
    title: "Pricing page",
    customTitle: null,
    displayTitle: "Pricing page",
    description: null,
    imageUrl: "",
    faviconUrl: "",
    tags: [],
    notes: null,
    groupId,
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

describe("undo copy and cache", () => {
  it("counts down the undo window and names the shortcut", () => {
    expect(undoSecondsLeft(0)).toBe(10);
    expect(undoSecondsLeft(1_100)).toBe(9);
    expect(undoSecondsLeft(UNDO_MS)).toBe(0);
    expect(undoShortcutLabel("MacIntel")).toBe("⌘Z");
    expect(undoShortcutLabel("Linux x86_64")).toBe("Ctrl+Z");
  });

  it("explains a move that did not stick", () => {
    expect(moveFailureNotice({ error: "  Group not found  " })).toBe("Group not found");
    expect(moveFailureNotice({ error: "Unauthorized" })).toBe(
      "Your session expired. Sign in again.",
    );
    expect(moveFailureNotice({})).toBe("Couldn't move that link. Try again.");
    expect(moveFailureNotice(null, true)).toMatch(/Couldn't reach memory404/);
  });

  it("explains a delete that did not stick", () => {
    expect(deleteFailureNotice({ error: "Unauthorized" })).toMatch(/session expired/i);
    expect(deleteFailureNotice({ error: "Failed to delete" })).toBe(DELETE_FAILED);
    expect(deleteFailureNotice({})).toBe(DELETE_FAILED);
    expect(deleteFailureNotice(null, true)).toMatch(/Couldn't reach memory404/);
    expect(deleteFailureNotice({ error: "Link not found" })).toBe("Link not found");
  });

  it("names a delete and a move", () => {
    expect(deleteUndoMessage()).toBe("Moved to Trash");
    expect(moveUndoMessage("References")).toBe("Moved to References");
    expect(moveUndoMessage("All")).toBe("Moved to All");
  });

  it("puts a restored link back into All and its group", () => {
    const restored = link("link-1", "references");
    const next = cacheWithLink(
      {
        all: [link("link-2", "general")],
        references: [],
        reading: [link("link-1", "reading")],
      },
      restored,
    );

    expect(next.all.map((item) => item.id)).toEqual(["link-1", "link-2"]);
    expect(next.references.map((item) => item.id)).toEqual(["link-1"]);
    expect(next.reading.map((item) => item.groupId)).toEqual(["reading"]);
  });
});
