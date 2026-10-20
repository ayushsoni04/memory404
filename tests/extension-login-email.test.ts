import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EMAIL_INVALID,
  SIGN_IN_UNREACHABLE,
  keepSignInForm,
  loginEmailIssue,
  passwordFieldInvalid,
  signInFailureMessage,
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
    expect(keepSignInForm("Invalid email or password")).toBe(true);
    expect(keepSignInForm("Failed to load groups")).toBe(false);
    expect(keepSignInForm("")).toBe(false);
  });

  it("ties a wrong password to the password field and keeps the prompt quiet", () => {
    expect(passwordFieldInvalid("Invalid email or password")).toBe(true);
    expect(passwordFieldInvalid("Failed to sign in")).toBe(true);
    expect(passwordFieldInvalid(SIGN_IN_UNREACHABLE)).toBe(true);
    expect(passwordFieldInvalid("Sign in to save this page.")).toBe(false);
    expect(passwordFieldInvalid(EMAIL_INVALID)).toBe(false);
    expect(passwordFieldInvalid("Failed to load groups")).toBe(false);
    expect(signInFailureMessage("Couldn't reach memory404. Check your connection and try again.")).toBe(
      SIGN_IN_UNREACHABLE,
    );
    expect(signInFailureMessage("Invalid email or password")).toBe("Invalid email or password");
  });

  it("is what the save overlay uses for the email and the app address", () => {
    const overlay = readFileSync("extension/src/overlay.jsx", "utf8");
    expect(overlay).toContain("keepSignInForm(error)");
    expect(overlay).toContain("passwordFieldInvalid(error)");
    expect(overlay).toContain("signInFailureMessage");
    expect(overlay).toContain('htmlFor="m404-app-url"');
    expect(overlay).toContain('aria-describedby=');
    expect(overlay).toContain("m404-overlay-error");
  });
});
