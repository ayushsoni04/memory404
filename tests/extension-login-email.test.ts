import { describe, expect, it } from "vitest";
import { EMAIL_INVALID, loginEmailIssue } from "../extension/src/login-email.js";

describe("extension login email", () => {
  it("rejects an incomplete address before sign-in", () => {
    expect(loginEmailIssue("user@localhost")).toBe(EMAIL_INVALID);
    expect(loginEmailIssue("ada@")).toBe(EMAIL_INVALID);
    expect(loginEmailIssue("not-an-email")).toBe(EMAIL_INVALID);
    expect(loginEmailIssue("  ")).toBe(EMAIL_INVALID);
  });

  it("accepts a normal address and ignores surrounding spaces", () => {
    expect(loginEmailIssue("ada@example.com")).toBeNull();
    expect(loginEmailIssue("  Ada@Example.com  ")).toBeNull();
  });
});
