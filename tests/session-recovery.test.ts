import { describe, expect, it } from "vitest";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/load-error";
import {
  isSessionExpiredMessage,
  sessionSignInHref,
} from "@/lib/session-recovery";

describe("session recovery", () => {
  it("recognises only the session sentence", () => {
    expect(isSessionExpiredMessage(SESSION_EXPIRED_MESSAGE)).toBe(true);
    expect(isSessionExpiredMessage(` ${SESSION_EXPIRED_MESSAGE} `)).toBe(true);
    expect(isSessionExpiredMessage("Couldn't reach memory404. Check your connection and try again.")).toBe(
      false,
    );
    expect(isSessionExpiredMessage(null)).toBe(false);
  });

  it("returns to the page that asked you to sign in", () => {
    expect(sessionSignInHref("/")).toBe("/login");
    expect(sessionSignInHref("/trash")).toBe("/login?redirect=%2Ftrash");
    expect(sessionSignInHref("/settings?tab=statistics")).toBe(
      "/login?redirect=%2Fsettings%3Ftab%3Dstatistics",
    );
    expect(sessionSignInHref("https://evil.example")).toBe("/login");
  });
});
