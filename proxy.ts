import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";

/** Routes reachable while signed out. Everything else redirects to /login. */
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/extension",
  "/brand",
  "/sidebar", // redirects to /brand
];

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/downloads/") ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  );
}

export async function proxy(request: NextRequest) {
  // Dev-only escape hatch. Ignored in production so real users always hit the gate.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_BYPASS === "1"
  ) {
    // Every page stays reachable, including /login, so you can still sign in
    // to a real account. With no session the API falls back to the dev user.
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await decryptSession(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static assets, downloads, and image-proxy so CDN-cached image GETs and file downloads never hit auth checks.
    "/((?!_next/static|_next/image|api/image-proxy|downloads/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|zip|ico)$).*)",
  ],
};
