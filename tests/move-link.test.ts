import { describe, expect, it } from "vitest";
import type { LinkApiRow } from "@/lib/links";
import { cacheAfterMove, linkStaysInOpenGroup } from "@/components/vault/move-link";

function link(id: string, groupId: string): LinkApiRow {
  return {
    id,
    url: "https://example.com/article",
    title: "A saved article",
    customTitle: null,
    displayTitle: "A saved article",
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

describe("moving a link between groups", () => {
  it("keeps the link on screen while All is open", () => {
    expect(linkStaysInOpenGroup("all", "references")).toBe(true);
    expect(linkStaysInOpenGroup(null, "references")).toBe(true);
  });

  it("removes the link from a group it is leaving", () => {
    expect(linkStaysInOpenGroup("general", "references")).toBe(false);
    expect(linkStaysInOpenGroup("references", "references")).toBe(true);
  });

  it("updates every cached list that holds the link", () => {
    const moved = link("link-1", "references");
    const next = cacheAfterMove(
      {
        all: [link("link-1", "general"), link("link-2", "general")],
        general: [link("link-1", "general")],
        references: [link("link-2", "references")],
      },
      "link-1",
      moved,
    );

    expect(next.all.map((item) => item.groupId)).toEqual(["references", "general"]);
    expect(next.general).toEqual([]);
    expect(next.references.map((item) => item.id)).toEqual(["link-1", "link-2"]);
  });
});
