import { afterEach, describe, expect, it, vi } from "vitest";
import { saveLinkNote } from "@/lib/save-link-note";

afterEach(() => {
  vi.unstubAllGlobals();
});

const link = {
  id: "link-1",
  url: "https://example.com/pricing",
  title: "Pricing page",
  customTitle: null,
  displayTitle: "Pricing page",
  description: null,
  imageUrl: "",
  faviconUrl: "",
  tags: [],
  notes: "Remember the pricing section.",
  groupId: "general",
  metadataStatus: "ready" as const,
  createdAt: "2026-10-01T12:00:00.000Z",
  deletedAt: null,
};

describe("saveLinkNote", () => {
  it("returns the updated link", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ link }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveLinkNote("link-1", "Remember the pricing section.")).resolves.toEqual({
      ok: true,
      link,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/links/link-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ notes: "Remember the pricing section." }),
      }),
    );
  });

  it("returns the server error and does not throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Could not save the note" }),
      }),
    );

    await expect(saveLinkNote("link-1", "note")).resolves.toEqual({
      ok: false,
      error: "Could not save the note",
    });
  });

  it("returns a network message when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(saveLinkNote("link-1", "note")).resolves.toEqual({
      ok: false,
      error: "Network error — the note was not saved",
    });
  });
});
