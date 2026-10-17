import { coerceHttpUrl, withoutTrackingParams } from "@/lib/links";
import { shareHostAliases, sharePageUrl } from "@/lib/share-page";

function canonicalHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Key for "is this page already saved?".
 * www, http or https, a trailing slash, a default port, a hash, and campaign
 * parameters do not make a second page. A YouTube share link and an X post
 * use one identity. The path and any other query stay as typed.
 */
export function savedPageKey(value: string): string | null {
  const prepared = coerceHttpUrl(value) ?? value.trim();
  let url: URL;
  try {
    url = new URL(withoutTrackingParams(prepared));
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url = sharePageUrl(url) ?? url;

  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  const withoutWww = host.startsWith("www.") ? host.slice(4) : host;
  url.hostname = withoutWww.includes(".") ? withoutWww : host;

  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }
  // An old http link and the https page are the same save.
  url.protocol = "https:";
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  }
  url.hash = "";
  return url.toString();
}

export type SavedPageCandidate = {
  id?: string;
  url: string;
  deletedAt?: Date | string | null;
  groupId?: string;
};

/** The link this page already belongs to. An active copy wins over Trash. */
export function pickExistingSavedPage<T extends SavedPageCandidate>(
  candidates: readonly T[],
  incoming: string,
): T | null {
  const key = savedPageKey(incoming);
  if (!key) return null;
  const matches = candidates.filter((item) => savedPageKey(item.url) === key);
  return matches.find((item) => item.deletedAt == null) ?? matches[0] ?? null;
}

/**
 * Host-anchored pattern for links that might be the same page.
 * Callers still compare `savedPageKey` so a different path is not a match.
 */
export function savedPageHostPattern(value: string): string | null {
  const key = savedPageKey(value);
  if (!key) return null;
  let host = "";
  try {
    host = new URL(key).hostname;
  } catch {
    return null;
  }
  if (!host.includes(".")) return null;
  const aliases = shareHostAliases(host) ?? [host];
  const escaped = aliases
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const prefix = aliases.length > 1 ? "(?:www\\.|m\\.|mobile\\.)?" : "(?:www\\.)?";
  return `^https?://${prefix}(?:${escaped})(?::\\d+)?(?:[/?#]|$)`;
}

/**
 * Put an equivalent saved page on the first page of results when text search missed it.
 * A full page stays the same length, so this does not invent an extra page.
 */
export function preferSamePageMatch<T extends SavedPageCandidate & { id: string }>(
  rows: readonly T[],
  query: string,
  candidates: readonly T[],
  limit: number,
  groupId?: string,
): T[] {
  const match = pickExistingSavedPage(
    candidates.filter((item) => {
      if (item.deletedAt != null) return false;
      if (groupId && item.groupId !== groupId) return false;
      return true;
    }),
    query,
  );
  if (!match?.id || rows.some((row) => row.id === match.id)) return [...rows];
  const room = rows.length > limit ? limit + 1 : Math.min(limit, rows.length + 1);
  return [match, ...rows].slice(0, room);
}

/**
 * Return a public http(s) URL when the query is itself a link, otherwise null.
 * A host without a scheme, like linear.app/docs, is treated as https.
 */
export function httpUrlFromQuery(query: string): string | null {
  const coerced = coerceHttpUrl(query);
  if (!coerced) return null;
  const url = canonicalHttpUrl(coerced);
  if (!url) return null;
  const host = new URL(url).hostname.replace(/\.$/, "").toLowerCase();
  if (!host.includes(".")) return null;
  return url;
}

/** Offer to save a typed URL only when search did not already find that page. */
export function saveOfferUrl(query: string, resultUrls: string[]): string | null {
  const url = httpUrlFromQuery(query);
  if (!url) return null;
  const target = savedPageKey(url);
  if (!target) return null;
  const alreadySaved = resultUrls.some((candidate) => {
    const comparable = savedPageKey(candidate);
    return comparable ? comparable === target : candidate === url;
  });
  return alreadySaved ? null : url;
}
