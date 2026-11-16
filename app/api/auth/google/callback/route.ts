import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { trustedAppOrigin } from "@/lib/app-origin";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { getMongoEnvError } from "@/lib/db/mongodb";
import {
  GOOGLE_OAUTH_CLIENT_COOKIE,
  GOOGLE_OAUTH_REDIRECT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  findOrCreateGoogleUser,
  googleOAuthCookieOptions,
  googleProfileFromCode,
  issueExtensionExchangeCode,
  parseGoogleOAuthClient,
} from "@/lib/google-oauth";
import { attachSessionCookie } from "@/lib/session";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const runtime = "nodejs";

function clearOAuthCookies(response: NextResponse): NextResponse {
  const cleared = { ...googleOAuthCookieOptions(), maxAge: 0 };
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", cleared);
  response.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, "", cleared);
  response.cookies.set(GOOGLE_OAUTH_CLIENT_COOKIE, "", cleared);
  response.cookies.set(GOOGLE_OAUTH_REDIRECT_COOKIE, "", cleared);
  return response;
}

function loginErrorRedirect(request: Request, code: string): NextResponse {
  const url = new URL("/login", trustedAppOrigin(request));
  url.searchParams.set("error", code);
  return clearOAuthCookies(NextResponse.redirect(url));
}

export async function GET(request: Request) {
  const limited = enforceAuthRateLimit(request, "google-callback", 20);
  if (limited) return limited;

  const envErr = getMongoEnvError();
  if (envErr) {
    return loginErrorRedirect(request, "google_failed");
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");

  if (oauthError) {
    return loginErrorRedirect(
      request,
      oauthError === "access_denied" ? "google_cancelled" : "google_failed",
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? null;
  const codeVerifier =
    cookieStore.get(GOOGLE_OAUTH_VERIFIER_COOKIE)?.value ?? null;
  const client = parseGoogleOAuthClient(
    cookieStore.get(GOOGLE_OAUTH_CLIENT_COOKIE)?.value,
  );
  const redirect = safeRedirectPath(
    cookieStore.get(GOOGLE_OAUTH_REDIRECT_COOKIE)?.value,
  );

  if (
    !code ||
    !state ||
    !storedState ||
    !codeVerifier ||
    state !== storedState
  ) {
    return loginErrorRedirect(request, "google_failed");
  }

  try {
    const profile = await googleProfileFromCode(request, code, codeVerifier);
    const user = await findOrCreateGoogleUser(profile);
    const sessionVersion = user.sessionVersion ?? 0;

    if (client === "extension") {
      const exchange = await issueExtensionExchangeCode(
        user.id,
        sessionVersion,
      );
      const bridge = new URL("/auth/extension", trustedAppOrigin(request));
      bridge.searchParams.set("code", exchange);
      const response = NextResponse.redirect(bridge);
      await attachSessionCookie(response, user.id, sessionVersion);
      return clearOAuthCookies(response);
    }

    const destination = new URL(redirect, trustedAppOrigin(request));
    const response = NextResponse.redirect(destination);
    await attachSessionCookie(response, user.id, sessionVersion);
    return clearOAuthCookies(response);
  } catch (e) {
    console.error("GET /api/auth/google/callback:", e);
    return loginErrorRedirect(request, "google_failed");
  }
}
