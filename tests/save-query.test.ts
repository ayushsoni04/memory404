import { describe, expect, it } from "vitest";
import { httpUrlFromQuery, saveOfferUrl } from "@/lib/save-query";

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

  it("offers a host without a scheme, and stays quiet when it is already saved", () => {
    expect(saveOfferUrl("linear.app/docs", [])).toBe("https://linear.app/docs");
    expect(
      saveOfferUrl("example.com", ["https://example.com"]),
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
});
