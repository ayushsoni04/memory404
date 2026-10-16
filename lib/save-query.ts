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
 * Key for "is this page already saved?".
 * www, a trailing slash, a default port, and a hash do not make a second page.
 */
function comparableSavedUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  const withoutWww = host.startsWith("www.") ? host.slice(4) : host;
  url.hostname = withoutWww.includes(".") ? withoutWww : host;

  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  }
  url.hash = "";
  return url.toString();
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
  const target = comparableSavedUrl(url);
  if (!target) return null;
  const alreadySaved = resultUrls.some((candidate) => {
    const comparable = comparableSavedUrl(candidate);
    return comparable ? comparable === target : candidate === url;
  });
  return alreadySaved ? null : url;
}
