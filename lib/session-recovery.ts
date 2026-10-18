import { SESSION_EXPIRED_MESSAGE } from "@/lib/load-error";
import { safeRedirectPath } from "@/lib/safe-redirect";

/** True when the sentence already tells someone the session is gone. */
export function isSessionExpiredMessage(message: string | null | undefined): boolean {
  return (message ?? "").trim() === SESSION_EXPIRED_MESSAGE;
}

/**
 * Sign-in URL that comes back to this page.
 * The library home does not need a redirect parameter.
 */
export function sessionSignInHref(returnPath: string): string {
  const safe = safeRedirectPath(returnPath);
  if (safe === "/") return "/login";
  return `/login?redirect=${encodeURIComponent(safe)}`;
}
