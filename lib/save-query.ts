import { LINK_URL_MAX } from "@/lib/links";

/** Return a public http(s) URL when the query is itself a link, otherwise null. */
export function httpUrlFromQuery(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > LINK_URL_MAX || /\s/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Offer to save a typed URL only when search did not already find that exact link. */
export function saveOfferUrl(query: string, resultUrls: string[]): string | null {
  const url = httpUrlFromQuery(query);
  if (!url) return null;
  const alreadySaved = resultUrls.some((candidate) => {
    try {
      return new URL(candidate).toString() === url;
    } catch {
      return candidate === url;
    }
  });
  return alreadySaved ? null : url;
}
