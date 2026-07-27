import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";

/** Routes reachable while signed out. Everything else redirects to /login. */
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/brand",
  "/sidebar", // redirects to /brand
];

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  );
}

export async function proxy(request: NextRequest) {
  // TEMP: skip login gate until public launch. APIs already fall back to DEV_USER.
  // Remove AUTH_BYPASS (or set to "0") when hosting for real users.
  if (process.env.AUTH_BYPASS === "1") {
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
    // Skip static assets and image-proxy so CDN-cached image GETs never hit auth checks.
    "/((?!_next/static|_next/image|api/image-proxy|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
