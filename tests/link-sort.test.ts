import { describe, expect, it } from "vitest";
import { getLinkDomain, getLinkType, sortLinks } from "@/components/vault/link-utils";
import type { LinkApiRow } from "@/lib/links";

function link(
  url: string,
  createdAt = "2026-10-01T00:00:00.000Z",
  title = url,
): LinkApiRow {
  return {
    id: url,
    url,
    title,
    customTitle: null,
    displayTitle: title,
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

describe("getLinkType", () => {
  it("matches the site, not a name that happens to contain it", () => {
    expect(getLinkType("https://x.com/ayush")).toBe("Twitter/X");
    expect(getLinkType("https://mobile.twitter.com/ayush")).toBe("Twitter/X");
    expect(getLinkType("https://www.netflix.com/title")).toBe("General");
    expect(getLinkType("https://dropbox.com/s/abc")).toBe("General");
    expect(getLinkType("https://box.com/s/abc")).toBe("General");
    expect(getLinkType("https://figma.com.evil.test/file")).toBe("General");
    expect(getLinkType("https://www.figma.com/file")).toBe("Figma");
    expect(getLinkType("https://www.youtube.com/watch")).toBe("YouTube");
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

  it("orders pages from the same site by name, ignoring letter case", () => {
    const sorted = sortLinks(
      [
        link("https://figma.com/z", "2026-10-03T00:00:00.000Z", "Zebra file"),
        link("https://www.figma.com/a", "2026-10-01T00:00:00.000Z", "alpha file"),
        link("https://dribbble.com/x", "2026-10-02T00:00:00.000Z", "Shot"),
        link("https://figma.com/b", "2026-10-04T00:00:00.000Z", "Alpha file"),
      ],
      "domain",
    ).map((item) => item.displayTitle);

    expect(sorted).toEqual(["Shot", "Alpha file", "alpha file", "Zebra file"]);
  });

  it("orders numbered names from the same site as 1, 2, 10", () => {
    const sorted = sortLinks(
      [
        link("https://figma.com/10", "2026-10-01T00:00:00.000Z", "File 10"),
        link("https://figma.com/2", "2026-10-02T00:00:00.000Z", "File 2"),
        link("https://figma.com/1", "2026-10-03T00:00:00.000Z", "File 1"),
      ],
      "domain",
    ).map((item) => item.displayTitle);

    expect(sorted).toEqual(["File 1", "File 2", "File 10"]);
  });
});
