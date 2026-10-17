import { describe, expect, it } from "vitest";
import {
  coerceHttpUrl,
  LINK_NOT_WEB,
  LINK_URL_MAX,
  linkUrlDraftIssue,
  linkUrlIssue,
  withoutTrackingParams,
} from "@/lib/links";

describe("coerceHttpUrl", () => {
  it("adds https to a pasted host and path", () => {
    expect(coerceHttpUrl("linear.app/docs")).toBe("https://linear.app/docs");
    expect(coerceHttpUrl("  EXAMPLE.com  ")).toBe("https://example.com");
    expect(coerceHttpUrl("example.com/")).toBe("https://example.com");
  });

  it("keeps an http(s) URL as typed", () => {
    expect(coerceHttpUrl("https://example.com/path")).toBe(
      "https://example.com/path",
    );
    expect(coerceHttpUrl("http://example.com/")).toBe("http://example.com/");
  });

  it("rejects sentences, scripts, and hosts with no dot", () => {
    expect(coerceHttpUrl("design inspiration")).toBeNull();
    expect(coerceHttpUrl("javascript:alert(1)")).toBeNull();
    expect(coerceHttpUrl("localhost")).toBeNull();
    expect(coerceHttpUrl("user:pass@example.com")).toBeNull();
    expect(coerceHttpUrl("")).toBeNull();
  });

  it("explains a link that is not a web page", () => {
    expect(linkUrlIssue("javascript:alert(1)")).toBe(LINK_NOT_WEB);
    expect(linkUrlIssue("mailto:ada@example.com")).toBe(LINK_NOT_WEB);
    expect(linkUrlIssue("ftp://files.example.com/a")).toBe(LINK_NOT_WEB);
    expect(linkUrlDraftIssue("mailto:ada@example.com")).toBe(LINK_NOT_WEB);
    expect(linkUrlDraftIssue("exa")).toBeNull();
    expect(linkUrlDraftIssue("")).toBeNull();
    expect(linkUrlIssue("https://example.com/docs")).toBeNull();
  });

  it("rejects a link that embeds a username or password", () => {
    expect(coerceHttpUrl("https://user:secret@example.com/docs")).toBeNull();
    expect(coerceHttpUrl("https://token@example.com/private")).toBeNull();
    expect(linkUrlIssue("https://user:secret@example.com/docs")).toBe(
      "Remove the username and password from the link.",
    );
  });

  it("saves the link inside a sentence, not the sentence", () => {
    expect(coerceHttpUrl("see https://example.com/docs.")).toBe(
      "https://example.com/docs",
    );
    expect(coerceHttpUrl("Check this: <https://example.com/article>")).toBe(
      "https://example.com/article",
    );
    expect(
      coerceHttpUrl('Read "https://example.com/watch?v=abc." today'),
    ).toBe("https://example.com/watch?v=abc");
    expect(
      coerceHttpUrl("https://en.wikipedia.org/wiki/Memory_(computing)"),
    ).toBe("https://en.wikipedia.org/wiki/Memory_(computing)");
    expect(coerceHttpUrl("(https://example.com/docs).")).toBe(
      "https://example.com/docs",
    );
    expect(linkUrlIssue("see https://example.com/docs please")).toBeNull();
    expect(linkUrlIssue("design inspiration")).toBe(
      "Enter a link, like example.com/page",
    );
    expect(linkUrlIssue("login at https://user:secret@example.com/docs")).toBe(
      "Remove the username and password from the link.",
    );
  });

  it("rejects a link that is too long to store", () => {
    const huge = `https://example.com/${"a".repeat(LINK_URL_MAX)}`;
    expect(coerceHttpUrl(huge)).toBeNull();
    expect(linkUrlIssue(huge)).toBe("That link is too long to save.");
    expect(linkUrlIssue("remember this later")).toBe(
      "Enter a link, like example.com/page",
    );
    expect(linkUrlIssue("https://example.com/docs")).toBeNull();
  });

  it("drops campaign parameters and keeps the rest of the link", () => {
    expect(
      coerceHttpUrl("https://example.com/article?utm_source=twitter&utm_medium=social"),
    ).toBe("https://example.com/article");
    expect(coerceHttpUrl("https://example.com/watch?v=abc&utm_source=share")).toBe(
      "https://example.com/watch?v=abc",
    );
    expect(coerceHttpUrl("https://example.com/?fbclid=IwAR0")).toBe("https://example.com");
    expect(coerceHttpUrl("example.com/docs?utm_campaign=launch")).toBe(
      "https://example.com/docs",
    );
    expect(coerceHttpUrl("https://example.com/docs?UTM_SOURCE=newsletter#start")).toBe(
      "https://example.com/docs#start",
    );
    expect(withoutTrackingParams("https://example.com/search?q=memory404")).toBe(
      "https://example.com/search?q=memory404",
    );
    expect(coerceHttpUrl("https://example.com/path")).toBe("https://example.com/path");
    expect(linkUrlIssue("https://example.com/article?gclid=abc")).toBeNull();
  });
});
