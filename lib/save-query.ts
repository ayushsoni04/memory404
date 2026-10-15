import { coerceHttpUrl } from "@/lib/links";

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

/** Offer to save a typed URL only when search did not already find that exact link. */
export function saveOfferUrl(query: string, resultUrls: string[]): string | null {
  const url = httpUrlFromQuery(query);
  if (!url) return null;
  const alreadySaved = resultUrls.some((candidate) => {
    const canonical = canonicalHttpUrl(candidate);
    return canonical ? canonical === url : candidate === url;
  });
  return alreadySaved ? null : url;
}
