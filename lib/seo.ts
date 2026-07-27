/**
 * SEO helpers aligned with Yoast + Shopify URL slug practices:
 * https://yoast.com/slug/
 * https://www.shopify.com/in/blog/seo-url
 *
 * Rules we enforce:
 * - lowercase only
 * - hyphens (not underscores) as word separators
 * - strip stop/filler words when generating from titles
 * - keep short (≈3–5 words)
 * - no special characters
 * - unique, permanent paths (redirect when renaming)
 */

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://memory404.app";
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "on",
  "in",
  "to",
  "for",
  "with",
  "from",
  "by",
  "at",
  "as",
  "is",
  "are",
  "how",
  "what",
  "why",
  "when",
  "your",
  "our",
]);

export type SlugifyOptions = {
  /** Max words after stop-word removal. Default 5 (Yoast 3–5). */
  maxWords?: number;
  /** Keep stop words when needed for clarity. Default false. */
  keepStopWords?: boolean;
};

/** Build an SEO-friendly slug from a human title. */
export function slugify(input: string, options: SlugifyOptions = {}): string {
  const maxWords = options.maxWords ?? 5;
  const keepStopWords = options.keepStopWords ?? false;

  const words = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .filter((w) => keepStopWords || !STOP_WORDS.has(w));

  return words.slice(0, maxWords).join("-");
}

/** Absolute URL for a path (always leading slash, no trailing slash except root). */
export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl().replace(/\/$/, "");
  if (!path || path === "/") return `${base}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized.replace(/\/$/, "")}`;
}

/**
 * Public, indexable marketing/auth routes.
 * Private app surfaces (vault, settings, trash, labs) stay out of the sitemap.
 */
export const PUBLIC_SEO_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "daily" as const },
  { path: "/brand", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/login", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/signup", priority: 0.7, changeFrequency: "monthly" as const },
] as const;
