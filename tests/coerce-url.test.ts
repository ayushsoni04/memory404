import { describe, expect, it } from "vitest";
import { coerceHttpUrl } from "@/lib/links";

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
});
