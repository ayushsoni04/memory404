import { describe, expect, it } from "vitest";
import { trustedAppOrigin } from "@/lib/app-origin";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { clientIp } from "@/lib/client-ip";
import { isAllowedCorsOrigin } from "@/lib/cors-origin";
import { duplicateLinkMessage } from "@/lib/links";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getPasswordRequirementIssues } from "@/lib/password-policy";
import {
  getAvatarUrlIssues,
  getUsernameIssues,
  isValidBannerStyle,
} from "@/lib/profile";
import { hashResetToken } from "@/lib/reset-token";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { decryptSession, encryptSession } from "@/lib/session";

describe("clientIp", () => {
  it("prefers x-real-ip over a spoofed forwarded header", () => {
    const request = new Request("http://localhost/api/auth/login", {
      headers: {
        "x-real-ip": "203.0.113.8",
        "x-forwarded-for": "1.2.3.4, 203.0.113.8",
      },
    });
    expect(clientIp(request)).toBe("203.0.113.8");
  });

  it("uses the rightmost forwarded hop when x-real-ip is absent", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "1.2.3.4, 198.51.100.20" },
    });
    expect(clientIp(request)).toBe("198.51.100.20");
  });
});

describe("auth rate limit", () => {
  it("returns 429 after the configured number of attempts", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-real-ip": "203.0.113.55" },
    });
    for (let i = 0; i < 3; i++) {
      expect(enforceAuthRateLimit(request, "unit-login", 3)).toBeNull();
    }
    const limited = enforceAuthRateLimit(request, "unit-login", 3);
    expect(limited?.status).toBe(429);
  });
});

describe("password and reset tokens", () => {
  it("hashes and verifies a password", async () => {
    const stored = await hashPassword("Correct-Horse-1");
    expect(stored).not.toContain("Correct-Horse-1");
    expect(await verifyPassword("Correct-Horse-1", stored)).toBe(true);
    expect(await verifyPassword("wrong-password", stored)).toBe(false);
    expect(await verifyPassword("Correct-Horse-1", "not-a-hash")).toBe(false);
  });

  it("lists missing password requirements", () => {
    expect(getPasswordRequirementIssues("short")).toEqual(
      expect.arrayContaining(["At least 8 characters", "An uppercase letter", "A number"]),
    );
    expect(getPasswordRequirementIssues("Memory404")).toEqual([]);
  });

  it("hashes reset tokens without keeping the raw value", () => {
    const token = "abc123";
    expect(hashResetToken(token)).toHaveLength(64);
    expect(hashResetToken(token)).not.toBe(token);
    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });
});

describe("session version", () => {
  it("round-trips the session version embedded in the jwt", async () => {
    process.env.SESSION_SECRET = "test-session-secret";
    const token = await encryptSession("user-1", 4);
    await expect(decryptSession(token)).resolves.toEqual({
      userId: "user-1",
      sessionVersion: 4,
    });
  });

  it("treats tokens minted before session versions as version 0", async () => {
    process.env.SESSION_SECRET = "test-session-secret";
    const { SignJWT } = await import("jose");
    const legacy = await new SignJWT({ userId: "user-2" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("test-session-secret"));
    await expect(decryptSession(legacy)).resolves.toEqual({
      userId: "user-2",
      sessionVersion: 0,
    });
  });
});

describe("profile, redirects, cors, and duplicate links", () => {
  it("validates usernames, banners, and avatars", () => {
    expect(getUsernameIssues("ab")).toContain("between 3 and 30 characters");
    expect(getUsernameIssues("good_name")).toEqual([]);
    expect(isValidBannerStyle("midnight")).toBe(true);
    expect(isValidBannerStyle("neon")).toBe(false);
    expect(getAvatarUrlIssues("data:image/svg+xml;base64,aaaa")).toEqual([
      "Avatar must be a PNG, JPEG, WebP, or GIF image",
    ]);
    expect(getAvatarUrlIssues("https://cdn.example.com/a.png")).toEqual([]);
  });

  it("rejects open redirects", () => {
    expect(safeRedirectPath("/trash")).toBe("/trash");
    expect(safeRedirectPath("//evil.example")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
    expect(safeRedirectPath("https://evil.example")).toBe("/");
  });

  it("does not reflect arbitrary CORS origins", () => {
    const allowed = ["http://localhost:3000"];
    expect(isAllowedCorsOrigin("http://localhost:3000", allowed)).toBe(true);
    expect(isAllowedCorsOrigin("https://linksavekren.vercel.app", allowed)).toBe(true);
    expect(isAllowedCorsOrigin("chrome-extension://abcdefgh", allowed)).toBe(true);
    expect(isAllowedCorsOrigin("https://evil.example", allowed)).toBe(false);
    expect(isAllowedCorsOrigin(undefined, allowed)).toBe(true);
  });

  it("explains when a duplicate url is sitting in trash", () => {
    expect(duplicateLinkMessage(false)).toMatch(/already exists/);
    expect(duplicateLinkMessage(true)).toMatch(/Trash/);
  });

  it("pins reset links to the configured app origin", () => {
    process.env.APP_URL = "https://linksavekren.vercel.app";
    const request = new Request("https://attacker.example/api/auth/forgot-password");
    expect(trustedAppOrigin(request)).toBe("https://linksavekren.vercel.app");
    delete process.env.APP_URL;
  });
});
