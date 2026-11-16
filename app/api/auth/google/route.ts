import { NextResponse } from "next/server";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import {
  GOOGLE_OAUTH_CLIENT_COOKIE,
  GOOGLE_OAUTH_REDIRECT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  createGoogleAuthorization,
  googleOAuthConfigured,
  googleOAuthCookieOptions,
  googleStartRedirectPath,
  parseGoogleOAuthClient,
} from "@/lib/google-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = enforceAuthRateLimit(request, "google-start", 20);
  if (limited) return limited;

  if (!googleOAuthConfigured()) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  const requestUrl = new URL(request.url);
  const client = parseGoogleOAuthClient(requestUrl.searchParams.get("client"));
  const redirect = googleStartRedirectPath(
    requestUrl.searchParams.get("redirect"),
  );

  try {
    const { url, state, codeVerifier } = createGoogleAuthorization(request);
    const response = NextResponse.redirect(url);
    const cookie = googleOAuthCookieOptions();
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, cookie);
    response.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, codeVerifier, cookie);
    response.cookies.set(GOOGLE_OAUTH_CLIENT_COOKIE, client, cookie);
    response.cookies.set(GOOGLE_OAUTH_REDIRECT_COOKIE, redirect, cookie);
    return response;
  } catch (e) {
    console.error("GET /api/auth/google:", e);
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "google_failed");
    return NextResponse.redirect(url);
  }
}
