import { describe, expect, it } from "vitest";
import { getLinkDomain, getLinkType, sortLinks } from "@/components/vault/link-utils";
import type { LinkApiRow } from "@/lib/links";

function link(url: string, createdAt = "2026-10-01T00:00:00.000Z"): LinkApiRow {
  return {
    id: url,
    url,
    title: url,
    customTitle: null,
    displayTitle: url,
    description: null,
    imageUrl: "",
    faviconUrl: "",
    tags: [],
    notes: null,
    groupId: "general",
    metadataStatus: "ready",
    createdAt,
    deletedAt: null,
  };
}

describe("getLinkDomain", () => {
  it("groups a site with and without www, ignoring letter case", () => {
    expect(getLinkDomain("https://www.NYTimes.com/a")).toBe("nytimes.com");
    expect(getLinkDomain("https://NYTimes.com/b")).toBe("nytimes.com");
    expect(getLinkDomain("https://WWW.apple.com")).toBe("apple.com");
  });

  it("does not strip www from the middle of a host", () => {
    expect(getLinkDomain("https://mywww.figma.com/file")).toBe("mywww.figma.com");
    expect(getLinkType("https://mywww.figma.com/file")).toBe("Figma");
    expect(getLinkType("https://www.figma.com/file")).toBe("Figma");
  });
});

describe("sortLinks by site", () => {
  it("puts www and capitalised hosts next to the bare host", () => {
    const sorted = sortLinks(
      [
        link("https://www.Zebra.com/z"),
        link("https://apple.com/a"),
        link("https://WWW.apple.com/b"),
      ],
      "domain",
    ).map((item) => item.url);

    expect(sorted).toEqual([
      "https://apple.com/a",
      "https://WWW.apple.com/b",
      "https://www.Zebra.com/z",
    ]);
  });
});
