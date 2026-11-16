import { afterEach, describe, expect, it } from "vitest";
import {
  googleAuthStartUrl,
  issueExtensionExchangeCode,
  consumeExtensionExchangeCode,
  parseGoogleOAuthClient,
} from "@/lib/google-oauth";

afterEach(() => {
  delete process.env.SESSION_SECRET;
});

describe("google oauth helpers", () => {
  it("builds start URLs for web and extension", () => {
    expect(googleAuthStartUrl("web")).toBe("/api/auth/google");
    expect(googleAuthStartUrl("extension")).toBe(
      "/api/auth/google?client=extension",
    );
    expect(googleAuthStartUrl("web", "/trash")).toBe(
      "/api/auth/google?redirect=%2Ftrash",
    );
    expect(googleAuthStartUrl("web", "//evil.example")).toBe("/api/auth/google");
  });

  it("parses the OAuth client cookie", () => {
    expect(parseGoogleOAuthClient("extension")).toBe("extension");
    expect(parseGoogleOAuthClient("web")).toBe("web");
    expect(parseGoogleOAuthClient(null)).toBe("web");
  });

  it("issues and consumes a short-lived extension exchange code", async () => {
    process.env.SESSION_SECRET = "test-session-secret-for-google-oauth";
    const code = await issueExtensionExchangeCode("user-1", 3);
    const payload = await consumeExtensionExchangeCode(code);
    expect(payload).toEqual({ userId: "user-1", sessionVersion: 3 });
    expect(await consumeExtensionExchangeCode("not-a-jwt")).toBeNull();
  });
});
