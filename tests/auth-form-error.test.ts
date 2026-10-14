import { describe, expect, it } from "vitest";
import { AUTH_OFFLINE_MESSAGE, authFailureMessage } from "@/lib/auth-form-error";

describe("authFailureMessage", () => {
  it("uses a trimmed server message", () => {
    expect(authFailureMessage({ error: "  Invalid email or password  " }, "Failed")).toBe(
      "Invalid email or password",
    );
  });

  it("falls back when the server sends no message", () => {
    expect(authFailureMessage({}, "Failed to sign in")).toBe("Failed to sign in");
    expect(authFailureMessage(null, "Failed to sign in")).toBe("Failed to sign in");
    expect(authFailureMessage({ error: "   " }, "Failed to sign in")).toBe(
      "Failed to sign in",
    );
  });

  it("explains a dropped connection even if a body came back", () => {
    expect(authFailureMessage({ error: "nope" }, "Failed", true)).toBe(
      AUTH_OFFLINE_MESSAGE,
    );
  });
});
