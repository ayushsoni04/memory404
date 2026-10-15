import { describe, expect, it } from "vitest";
import { coerceHttpUrl, LINK_URL_MAX, linkUrlIssue } from "@/lib/links";

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

  it("rejects a link that embeds a username or password", () => {
    expect(coerceHttpUrl("https://user:secret@example.com/docs")).toBeNull();
    expect(coerceHttpUrl("https://token@example.com/private")).toBeNull();
    expect(linkUrlIssue("https://user:secret@example.com/docs")).toBe(
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
});
