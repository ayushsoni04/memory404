/** Shown when the browser never got a response from memory404. */
export const UNREACHABLE_MESSAGE =
  "Couldn't reach memory404. Check your connection and try again.";

/** Shown when the API rejects the session cookie. */
export const SESSION_EXPIRED_MESSAGE = "Your session expired. Sign in again.";

const BROWSER_NETWORK_ERROR =
  /^(failed to fetch|networkerror when attempting to fetch resource\.?|load failed|network request failed)$/i;

const SESSION_EXPIRED = /^unauthorized\.?$/i;

/**
 * Replace a raw browser network error, or a bare "Unauthorized", with a
 * sentence a person can act on. Other server messages stay as written.
 */
export function explainLoadError(message: string | null | undefined): string | null {
  if (message == null) return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  if (BROWSER_NETWORK_ERROR.test(trimmed)) return UNREACHABLE_MESSAGE;
  if (SESSION_EXPIRED.test(trimmed)) return SESSION_EXPIRED_MESSAGE;
  return message;
}

/** Add a period when the message does not already end a sentence. */
export function asSentence(message: string): string {
  return /[.!?]$/.test(message.trim()) ? message.trim() : `${message.trim()}.`;
}
