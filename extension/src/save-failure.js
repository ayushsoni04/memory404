/** Shown when the extension never gets a response from memory404. */
export const EXTENSION_UNREACHABLE =
  "Couldn't reach memory404. Check your connection and try again.";

/** Same sentence the library uses when the session cookie is rejected. */
export const EXTENSION_SESSION_EXPIRED = "Your session expired. Sign in again.";

/**
 * A timeout or a dropped connection, in a sentence.
 * A message that already explains the problem stays as written.
 * @param {unknown} message
 */
export function explainSaveFailure(message) {
  const value = String(message ?? "").trim();
  if (!value) return EXTENSION_UNREACHABLE;
  if (/timed out/i.test(value)) return EXTENSION_UNREACHABLE;
  if (
    /^(?:typeerror:\s*)?failed to fetch$/i.test(value) ||
    /^networkerror when attempting to fetch resource\.?$/i.test(value) ||
    /^load failed$/i.test(value) ||
    /^network request failed$/i.test(value)
  ) {
    return EXTENSION_UNREACHABLE;
  }
  if (/session expired/i.test(value)) return EXTENSION_SESSION_EXPIRED;
  return value;
}
