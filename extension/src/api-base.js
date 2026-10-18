export const APP_URL_HINT = "Enter a full URL like http://localhost:3000";

const FALLBACK_API_BASE = "http://localhost:3000";

function withScheme(raw) {
  if (/^https?:\/\//i.test(raw)) return raw;
  // localhost:3000 is a port, not a scheme. javascript: and ftp: are schemes.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^[a-z0-9.-]+:\d+/i.test(raw)) return raw;
  const host = raw.split("/")[0];
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  return `${local ? "http" : "https"}://${raw}`;
}

/**
 * The origin the extension should call.
 * A missing scheme is filled in. A path is dropped. Anything that is not
 * http(s), or that carries a username, is rejected.
 */
export function normalizeApiBase(raw, fallback = FALLBACK_API_BASE) {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  let url;
  try {
    url = new URL(withScheme(trimmed || fallback));
  } catch {
    return { ok: false, error: APP_URL_HINT };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: APP_URL_HINT };
  }
  if (url.username || url.password || !url.hostname) {
    return { ok: false, error: APP_URL_HINT };
  }
  return { ok: true, apiBase: url.origin };
}

/** True when two App URL values point at different servers. */
export function apiBaseChanged(previous, next) {
  const before = normalizeApiBase(previous);
  const after = normalizeApiBase(next);
  if (!before.ok || !after.ok) return false;
  return before.apiBase !== after.apiBase;
}
