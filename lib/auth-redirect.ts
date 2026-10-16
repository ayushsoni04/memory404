import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Keep a safe in-app destination when someone moves between sign-in,
 * sign-up, and the reset-link screen.
 */
export function withAuthRedirect(
  path: "/login" | "/signup" | "/forgot-password",
  redirect: string | null | undefined,
): string {
  const safe = safeRedirectPath(redirect);
  if (safe === "/") return path;
  return `${path}?redirect=${encodeURIComponent(safe)}`;
}
