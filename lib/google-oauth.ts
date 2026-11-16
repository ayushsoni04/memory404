import {
  Google,
  decodeIdToken,
  generateCodeVerifier,
  generateState,
} from "arctic";
import { SignJWT, jwtVerify } from "jose";
import { trustedAppOrigin } from "@/lib/app-origin";
import {
  createOAuthUser,
  findUserByEmail,
  updateUserProfile,
} from "@/lib/db/repositories";
import type { UserRow } from "@/lib/db/types";
import { normalizeEmail } from "@/lib/auth-email";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const GOOGLE_OAUTH_STATE_COOKIE = "m404_google_oauth_state";
export const GOOGLE_OAUTH_VERIFIER_COOKIE = "m404_google_oauth_verifier";
export const GOOGLE_OAUTH_CLIENT_COOKIE = "m404_google_oauth_client";
export const GOOGLE_OAUTH_REDIRECT_COOKIE = "m404_google_oauth_redirect";

const EXCHANGE_TTL_SECONDS = 120;

import type { GoogleOAuthClient } from "@/lib/google-oauth-url";

export type { GoogleOAuthClient } from "@/lib/google-oauth-url";
export { googleAuthStartUrl } from "@/lib/google-oauth-url";

export function googleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function googleOAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
}

export function createGoogleClient(request: Request): Google {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured");
  }
  const redirectURI = `${trustedAppOrigin(request)}/api/auth/google/callback`;
  return new Google(clientId, clientSecret, redirectURI);
}

export function createGoogleAuthorization(request: Request): {
  url: URL;
  state: string;
  codeVerifier: string;
} {
  const google = createGoogleClient(request);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);
  url.searchParams.set("prompt", "select_account");
  return { url, state, codeVerifier };
}

export function parseGoogleOAuthClient(
  raw: string | null | undefined,
): GoogleOAuthClient {
  return raw === "extension" ? "extension" : "web";
}

type GoogleIdClaims = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
};

export async function googleProfileFromCode(
  request: Request,
  code: string,
  codeVerifier: string,
): Promise<{
  email: string;
  name: string | null;
  avatarUrl: string | null;
  googleSub: string;
}> {
  const google = createGoogleClient(request);
  const tokens = await google.validateAuthorizationCode(code, codeVerifier);
  const claims = decodeIdToken(tokens.idToken()) as GoogleIdClaims;
  const email = normalizeEmail(
    typeof claims.email === "string" ? claims.email : "",
  );
  const googleSub = typeof claims.sub === "string" ? claims.sub.trim() : "";
  if (!email || !googleSub) {
    throw new Error("Google account did not return a verified email");
  }
  if (claims.email_verified === false) {
    throw new Error("Verify your Google email, then try again");
  }
  const name =
    typeof claims.name === "string" && claims.name.trim()
      ? claims.name.trim()
      : null;
  const avatarUrl =
    typeof claims.picture === "string" && claims.picture.trim()
      ? claims.picture.trim()
      : null;
  return { email, name, avatarUrl, googleSub };
}

/** Find an existing account by email, or create an OAuth-only user. */
export async function findOrCreateGoogleUser(profile: {
  email: string;
  name: string | null;
  avatarUrl: string | null;
}): Promise<UserRow> {
  const existing = await findUserByEmail(profile.email);
  if (existing) {
    const patch: { name?: string | null; avatarUrl?: string | null } = {};
    if (!existing.name && profile.name) patch.name = profile.name;
    if (!existing.avatarUrl && profile.avatarUrl) {
      patch.avatarUrl = profile.avatarUrl;
    }
    if (Object.keys(patch).length > 0) {
      const updated = await updateUserProfile(existing.id, patch);
      if (updated) return updated;
    }
    return existing;
  }
  return createOAuthUser({
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    leadSource: "google",
  });
}

function exchangeSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

/** Short-lived JWT the extension exchanges for a real session token. */
export async function issueExtensionExchangeCode(
  userId: string,
  sessionVersion: number,
): Promise<string> {
  return new SignJWT({
    purpose: "extension-exchange",
    userId,
    sv: sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXCHANGE_TTL_SECONDS}s`)
    .sign(exchangeSecret());
}

export async function consumeExtensionExchangeCode(
  code: string,
): Promise<{ userId: string; sessionVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(code, exchangeSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose !== "extension-exchange") return null;
    if (typeof payload.userId !== "string" || !payload.userId) return null;
    const sessionVersion =
      typeof payload.sv === "number" &&
      Number.isInteger(payload.sv) &&
      payload.sv >= 0
        ? payload.sv
        : 0;
    return { userId: payload.userId, sessionVersion };
  } catch {
    return null;
  }
}

export function googleStartRedirectPath(
  redirect: string | null | undefined,
): string {
  return safeRedirectPath(redirect);
}
