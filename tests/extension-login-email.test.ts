import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EMAIL_INVALID,
  keepSignInForm,
  loginEmailIssue,
} from "../extension/src/login-email.js";

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

  it("keeps the sign-in form up when the address is not an email", () => {
    expect(keepSignInForm("Sign in to memory404 to save links")).toBe(true);
    expect(keepSignInForm("Failed to sign in")).toBe(true);
    expect(keepSignInForm(EMAIL_INVALID)).toBe(true);
    expect(keepSignInForm("Failed to load groups")).toBe(false);
    expect(keepSignInForm("")).toBe(false);
  });

  it("is what the save overlay uses for the email and the app address", () => {
    const overlay = readFileSync("extension/src/overlay.jsx", "utf8");
    expect(overlay).toContain("keepSignInForm(error)");
    expect(overlay).toContain('htmlFor="m404-app-url"');
    expect(overlay).toContain('aria-describedby=');
    expect(overlay).toContain("m404-overlay-error");
  });
});
