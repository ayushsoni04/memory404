import { load, type CheerioAPI } from "cheerio";
import { applyProviderMetadata } from "@/lib/link-providers";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 900_000;

/** Full browser UA — many sites (YouTube, Medium) serve minimal HTML to generic bots. */
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

function normalizeText(raw: string | undefined | null): string {
  if (raw == null) return "";
  return raw.replace(/\s+/g, " ").trim();
}

/** Decode common HTML entities in meta/title strings (og:title often has &amp;). */
export function decodeHtmlEntities(s: string): string {
  if (!s.includes("&")) return s;
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x0*27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) && code > 0 && code < 0x11_0000
        ? String.fromCodePoint(code)
        : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) && code > 0 && code < 0x11_0000
        ? String.fromCodePoint(code)
        : _;
    });
}

function metaContent($: CheerioAPI, selectors: string[]): string {
  for (const sel of selectors) {
    const el = $(sel).first();
    const c = normalizeText(el.attr("content") ?? el.attr("value"));
    if (c) return decodeHtmlEntities(c);
  }
  return "";
}

function absolutizeImageUrl(
  raw: string | undefined | null,
  baseUrl: string,
): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.startsWith("data:") || t.startsWith("javascript:")) return null;
  try {
    const u = new URL(t, baseUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.href.length > 2048) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Best `<link rel="…icon…">` href: apple-touch first, then largest `sizes`, then any icon. */
function extractFaviconFromDocument(
  $: CheerioAPI,
  pageUrl: string,
): string | null {
  const fromHref = (rel: string) => {
    const href = $(`link[rel="${rel}"]`).first().attr("href");
    return absolutizeImageUrl(href, pageUrl);
  };

  const apple =
    fromHref("apple-touch-icon") ??
    fromHref("apple-touch-icon-precomposed");
  if (apple) return apple;

  let bestUrl: string | null = null;
  let bestPx = -1;
  let firstIcon: string | null = null;
  $('link[rel="icon"], link[rel="shortcut icon"]').each((_, el) => {
    const href = $(el).attr("href");
    const abs = absolutizeImageUrl(href, pageUrl);
    if (!abs) return;
    if (!firstIcon) firstIcon = abs;
    const sizes = $(el).attr("sizes");
    let px = 0;
    if (sizes) {
      const m = sizes.match(/(\d+)\s*x\s*(\d+)/i);
      if (m) px = Math.max(parseInt(m[1], 10), parseInt(m[2], 10));
    }
    if (px > bestPx) {
      bestPx = px;
      bestUrl = abs;
    }
  });
  if (bestUrl) return bestUrl;
  if (firstIcon) return firstIcon;

  const mask = $('link[rel="mask-icon"]').first().attr("href");
  const maskAbs = absolutizeImageUrl(mask, pageUrl);
  if (maskAbs) return maskAbs;

  return null;
}

function extractPreviewImageUrl(
  $: CheerioAPI,
  pageUrl: string,
): string | null {
  const tryMeta = (selectors: string[]): string | null => {
    for (const sel of selectors) {
      const el = $(sel).first();
      const raw = el.attr("content") ?? el.attr("href");
      const abs = absolutizeImageUrl(raw, pageUrl);
      if (abs) return abs;
    }
    return null;
  };

  return (
    tryMeta([
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image:url"]',
      'meta[property="og:image"]',
    ]) ??
    tryMeta([
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'meta[property="twitter:image"]',
    ]) ??
    (() => {
      const href = $('link[rel="image_src"]').first().attr("href");
      return absolutizeImageUrl(href, pageUrl);
    })() ??
    extractFaviconFromDocument($, pageUrl)
  );
}

export function isGarbageTitle(title: string, pageUrl: string): boolean {
  const t = normalizeText(title);
  if (t.length < 2) return true;
  const lower = t.toLowerCase();
  if (
    ["untitled", "loading…", "loading...", "error", "403 forbidden"].includes(
      lower,
    )
  ) {
    return true;
  }
  if (/^https?:\/\//i.test(t) && t.length < 120) return true;
  try {
    const u = new URL(pageUrl);
    if (t === u.hostname || t === u.host) return true;
    const path = u.pathname.replace(/\/$/, "") || "/";
    if (t === path || t === "/") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function polishTitle(title: string, pageUrl: string): string {
  let t = decodeHtmlEntities(normalizeText(title));
  try {
    const host = new URL(pageUrl).hostname;
    if (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("m.youtube.com")
    ) {
      t = t.replace(/\s*[-–—]\s*YouTube\s*$/i, "").trim();
    }
  } catch {
    /* ignore */
  }
  return normalizeText(t);
}

function extractJsonLdTitles($: CheerioAPI): string[] {
  const out: string[] = [];
  $("script[type='application/ld+json']").each((_, el) => {
    const raw = $(el).text()?.trim();
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as unknown;
      const visit = (node: unknown) => {
        if (node == null) return;
        if (Array.isArray(node)) {
          node.forEach(visit);
          return;
        }
        if (typeof node !== "object") return;
        const o = node as Record<string, unknown>;
        if (Array.isArray(o["@graph"])) visit(o["@graph"]);
        for (const key of ["headline", "name", "title"]) {
          const v = o[key];
          if (typeof v === "string" && normalizeText(v)) out.push(v);
        }
      };
      visit(data);
    } catch {
      /* invalid JSON-LD */
    }
  });
  return out;
}

function pickTitle(
  $: CheerioAPI,
  pageUrl: string,
  fallbackUrl: string,
): string {
  const fallbackTitle =
    polishTitle(fallbackUrl, fallbackUrl) ||
    normalizeText(fallbackUrl) ||
    "Untitled link";

  const candidates: string[] = [
    metaContent($, ['meta[property="og:title"]']),
    metaContent($, ['meta[property="og:headline"]']),
    metaContent($, [
      'meta[name="twitter:title"]',
      'meta[property="twitter:title"]',
    ]),
    metaContent($, ['meta[name="title"]']),
    ...extractJsonLdTitles($),
    decodeHtmlEntities(normalizeText($("title").first().text())),
    // Stack Overflow / docs: question or page title often in h1 > a
    decodeHtmlEntities(normalizeText($("h1 a").first().text())),
    decodeHtmlEntities(normalizeText($("h1").first().text())),
    decodeHtmlEntities(
      normalizeText($('[itemprop="headline"], [itemprop="name"]').first().text()),
    ),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const polished = polishTitle(raw, pageUrl);
    if (polished && !isGarbageTitle(polished, pageUrl)) {
      return polished;
    }
  }

  return fallbackTitle;
}

/** Block obvious SSRF targets (localhost). */
export function isPublicHttpUrlForFetch(urlString: string): boolean {
  try {
    const u = new URL(urlString.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1")
      return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches page HTML with timeout and a real browser User-Agent.
 */
export async function fetchPageHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": BROWSER_UA,
        "Upgrade-Insecure-Requests": "1",
      },
    });
    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    const slice =
      buf.byteLength > MAX_HTML_BYTES
        ? buf.slice(0, MAX_HTML_BYTES)
        : buf;
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export type LinkPageMetadata = {
  title: string;
  description: string;
  /** Absolute https preview image URL from og/twitter meta, or null */
  imageUrl: string | null;
};

/**
 * Extracts title (og → twitter → <title> → h1 → URL), description, preview image.
 * Never returns null title; image may be null.
 */
export async function extractLinkMetadata(
  pageUrl: string,
  fallbackUrl: string,
): Promise<LinkPageMetadata> {
  const fallbackTitle =
    polishTitle(fallbackUrl, fallbackUrl) ||
    normalizeText(fallbackUrl) ||
    "Untitled link";

  if (!isPublicHttpUrlForFetch(pageUrl)) {
    return applyProviderMetadata(pageUrl, {
      title: fallbackTitle,
      description: "",
      imageUrl: null,
    });
  }

  try {
    const html = await fetchPageHtml(pageUrl);
    if (!html) {
      return applyProviderMetadata(pageUrl, {
        title: fallbackTitle,
        description: "",
        imageUrl: null,
      });
    }

    const $ = load(html);

    const title = pickTitle($, pageUrl, fallbackUrl);

    let description = metaContent($, [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[property="twitter:description"]',
    ]);
    if (!description) {
      description = metaContent($, [
        'meta[name="description"]',
        'meta[itemprop="description"]',
      ]);
    }

    const imageUrl = extractPreviewImageUrl($, pageUrl);

    return applyProviderMetadata(pageUrl, {
      title,
      description,
      imageUrl,
    });
  } catch {
    return applyProviderMetadata(pageUrl, {
      title: fallbackTitle,
      description: "",
      imageUrl: null,
    });
  }
}
