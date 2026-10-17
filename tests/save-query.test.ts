import { describe, expect, it } from "vitest";
import {
  httpUrlFromQuery,
  pickExistingSavedPage,
  preferSamePageMatch,
  savedPageHostPattern,
  savedPageKey,
  saveOfferUrl,
} from "@/lib/save-query";

describe("httpUrlFromQuery", () => {
  it("accepts http and https links", () => {
    expect(httpUrlFromQuery("https://example.com/path")).toBe(
      "https://example.com/path",
    );
    expect(httpUrlFromQuery("  http://example.com  ")).toBe("http://example.com/");
  });

  it("accepts a host that left off https", () => {
    expect(httpUrlFromQuery("linear.app/docs")).toBe("https://linear.app/docs");
    expect(httpUrlFromQuery("example.com")).toBe("https://example.com/");
  });

  it("rejects titles, notes, and non-http schemes", () => {
    expect(httpUrlFromQuery("design inspiration")).toBeNull();
    expect(httpUrlFromQuery("javascript:alert(1)")).toBeNull();
    expect(httpUrlFromQuery("https://localhost")).toBeNull();
    expect(httpUrlFromQuery("https://user:secret@example.com/docs")).toBeNull();
  });
});

describe("saveOfferUrl", () => {
  it("offers a save when the typed URL is not already in the results", () => {
    expect(saveOfferUrl("https://example.com", ["https://other.test/"])).toBe(
      "https://example.com/",
    );
  });

  it("stays quiet when that URL is already saved", () => {
    expect(
      saveOfferUrl("https://example.com/", ["https://example.com/"]),
    ).toBeNull();
  });

  it("offers the link inside a sentence, not the sentence", () => {
    expect(saveOfferUrl("see https://example.com/docs.", [])).toBe(
      "https://example.com/docs",
    );
    expect(saveOfferUrl("design inspiration", [])).toBeNull();
  });

  it("offers a host without a scheme, and stays quiet when it is already saved", () => {
    expect(saveOfferUrl("linear.app/docs", [])).toBe("https://linear.app/docs");
    expect(
      saveOfferUrl("example.com", ["https://example.com"]),
    ).toBeNull();
  });

  it("treats http and https as the same saved page", () => {
    expect(
      saveOfferUrl("http://example.com/docs", ["https://example.com/docs"]),
    ).toBeNull();
    expect(
      saveOfferUrl("https://example.com/docs", ["http://example.com/docs"]),
    ).toBeNull();
  });

  it("treats www, a trailing slash, and a hash as the same saved page", () => {
    expect(
      saveOfferUrl("https://www.example.com/docs/", [
        "https://example.com/docs",
      ]),
    ).toBeNull();
    expect(
      saveOfferUrl("https://example.com/docs#pricing", [
        "https://example.com/docs",
      ]),
    ).toBeNull();
    expect(
      saveOfferUrl("https://example.com:443/docs", ["https://example.com/docs"]),
    ).toBeNull();
    expect(
      saveOfferUrl("https://www.example.com/other", ["https://example.com/docs"]),
    ).toBe("https://www.example.com/other");
  });

  it("stays quiet when the saved copy still has a campaign parameter", () => {
    expect(
      saveOfferUrl("https://example.com/docs", [
        "https://www.example.com/docs/?utm_source=twitter",
      ]),
    ).toBeNull();
  });
});

describe("savedPageKey", () => {
  it("treats www, a slash, a hash, a default port, and campaign tags as one page", () => {
    const key = savedPageKey("https://example.com/docs");
    expect(savedPageKey("https://www.example.com/docs/")).toBe(key);
    expect(savedPageKey("https://example.com/docs#pricing")).toBe(key);
    expect(savedPageKey("https://example.com:443/docs")).toBe(key);
    expect(savedPageKey("https://example.com/docs?utm_source=share")).toBe(key);
    expect(savedPageKey("https://example.com/docs?v=1")).not.toBe(key);
    expect(savedPageKey("http://example.com/docs")).toBe(key);
    expect(savedPageKey("http://example.com:80/docs")).toBe(key);
    expect(savedPageKey("http://example.com:8080/docs")).not.toBe(key);
  });

  it("treats the same query parameters in a different order as one page", () => {
    const key = savedPageKey("https://example.com/search?a=1&b=2");
    expect(savedPageKey("https://example.com/search?b=2&a=1")).toBe(key);
    expect(savedPageKey("https://www.example.com/search/?b=2&a=1#top")).toBe(key);
    expect(savedPageKey("https://example.com/search?tag=b&tag=a")).toBe(
      savedPageKey("https://example.com/search?tag=a&tag=b"),
    );
    expect(savedPageKey("https://example.com/search?a=1&b=3")).not.toBe(key);
    expect(savedPageKey("https://example.com/search?a=1")).not.toBe(key);
    expect(savedPageKey("https://example.com/watch?v=abc&utm_source=share")).toBe(
      savedPageKey("https://example.com/watch?v=abc"),
    );
  });
});

describe("pickExistingSavedPage", () => {
  const active = {
    id: "active",
    url: "https://www.example.com/docs/",
    deletedAt: null,
  };
  const trashed = {
    id: "trashed",
    url: "https://example.com/docs#old",
    deletedAt: "2026-10-01T00:00:00.000Z",
  };

  it("prefers the copy that is still in the library", () => {
    expect(pickExistingSavedPage([trashed, active], "example.com/docs")?.id).toBe(
      "active",
    );
  });

  it("reports a match that only exists in Trash", () => {
    expect(pickExistingSavedPage([trashed], "https://example.com/docs/")?.id).toBe(
      "trashed",
    );
  });

  it("ignores a different path on the same site", () => {
    expect(pickExistingSavedPage([active], "https://example.com/other")).toBeNull();
  });
});

describe("savedPageHostPattern", () => {
  it("matches this host, including www, and not a longer host", () => {
    const pattern = savedPageHostPattern("https://www.example.com/docs/");
    expect(pattern).toBeTruthy();
    const re = new RegExp(pattern!, "i");
    expect(re.test("https://example.com/docs")).toBe(true);
    expect(re.test("https://www.example.com/")).toBe(true);
    expect(re.test("https://example.com.evil/docs")).toBe(false);
    expect(re.test("https://notexample.com/docs")).toBe(false);
  });
});

describe("preferSamePageMatch", () => {
  const saved = {
    id: "saved",
    url: "https://example.com/docs",
    groupId: "reading",
    deletedAt: null,
  };

  it("adds the equivalent page when text search missed it", () => {
    const page = preferSamePageMatch(
      [{ id: "other", url: "https://other.test/", groupId: "reading", deletedAt: null }],
      "https://www.example.com/docs/",
      [saved],
      8,
    );
    expect(page.map((link) => link.id)).toEqual(["saved", "other"]);
  });

  it("does not grow a full page or pull in a trashed copy", () => {
    const full = Array.from({ length: 8 }, (_, index) => ({
      id: `row-${index}`,
      url: `https://other.test/${index}`,
      deletedAt: null,
    }));
    const page = preferSamePageMatch(full, "https://example.com/docs", [saved], 8);
    expect(page).toHaveLength(8);
    expect(page[0]?.id).toBe("saved");

    const hidden = preferSamePageMatch(
      [],
      "https://example.com/docs",
      [{ ...saved, deletedAt: "2026-10-01T00:00:00.000Z" }],
      8,
    );
    expect(hidden).toEqual([]);
  });

  it("leaves a link that belongs to another group out of a group search", () => {
    expect(
      preferSamePageMatch([], "https://example.com/docs", [saved], 8, "other"),
    ).toEqual([]);
  });
});
