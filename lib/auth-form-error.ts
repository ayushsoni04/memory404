/** Shown when sign-in, sign-up, or a password request never gets a response. */
export const AUTH_OFFLINE_MESSAGE =
  "Couldn't reach memory404. Check your connection and try again.";

/** Prefer the server's error. A dropped connection uses the offline message. */
export function authFailureMessage(
  data: unknown,
  fallback: string,
  offline = false,
): string {
  if (!offline && data && typeof data === "object") {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error.trim();
  }
  if (offline) return AUTH_OFFLINE_MESSAGE;
  return fallback;
}
