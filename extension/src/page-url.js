/** Shown when the save panel cannot run on the current tab. */
export const BLOCKED_PAGE_MESSAGE =
  "This page can't be saved. Open a normal website and try again.";

const BLOCKED_PREFIXES = [
  "about:",
  "brave://",
  "chrome-extension://",
  "chrome-untrusted://",
  "chrome://",
  "devtools://",
  "edge://",
  "file:",
  "opera://",
  "view-source:",
  "vivaldi://",
];

/**
 * Why this tab cannot host the save panel, or null when it can.
 * Empty urls happen on the new tab page before a site loads.
 * @param {unknown} url
 */
export function blockedPageMessage(url) {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) return BLOCKED_PAGE_MESSAGE;
  const lower = value.toLowerCase();
  if (
    lower.startsWith("https://chrome.google.com/webstore") ||
    lower.startsWith("https://chromewebstore.google.com")
  ) {
    return BLOCKED_PAGE_MESSAGE;
  }
  if (BLOCKED_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return BLOCKED_PAGE_MESSAGE;
  }
  return null;
}
