/** Shown when the browser never got a response from memory404. */
export const UNREACHABLE_MESSAGE =
  "Couldn't reach memory404. Check your connection and try again.";

const BROWSER_NETWORK_ERROR =
  /^(failed to fetch|networkerror when attempting to fetch resource\.?|load failed|network request failed)$/i;

/**
 * Replace a raw browser network error with a sentence a person can act on.
 * Server messages, including "Failed to load links", stay as written.
 */
export function explainLoadError(message: string | null | undefined): string | null {
  if (message == null) return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  if (BROWSER_NETWORK_ERROR.test(trimmed)) return UNREACHABLE_MESSAGE;
  return message;
}

/** Add a period when the message does not already end a sentence. */
export function asSentence(message: string): string {
  return /[.!?]$/.test(message.trim()) ? message.trim() : `${message.trim()}.`;
}
