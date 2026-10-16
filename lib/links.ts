import type { LinkMetadataStatus } from "@/lib/db/types";
import {
  providerPreviewIcon,
  resolveProviderDisplayTitle,
} from "@/lib/link-providers";
import { isUnreliableScreenshotUrl } from "@/lib/screenshot";

export type LinkApiRow = {
  id: string;
  url: string;
  /** System / metadata title (never overwritten by user rename). */
  title: string;
  customTitle: string | null;
  description: string | null;
  /**
   * Preview image: stored og/twitter/icon from scrape, or Google favicon fallback
   * so the card always has a visual when the URL is valid.
   */
  imageUrl: string;
  /** Site favicon/logo; falls back to Google favicon by host. */
  faviconUrl: string;
  tags: string[];
  notes: string | null;
  groupId: string;
  /** Background metadata enrichment: pending until scrape finishes. */
  metadataStatus: LinkMetadataStatus;
  createdAt: string;
  /** ISO string or null. Set when link is in Trash. */
  deletedAt: string | null;
  /** `customTitle ?? title` */
  displayTitle: string;
  isPending?: boolean;
};

/** Reliable favicon URL for any http(s) page (used when no og:image was stored). */
export function googleFaviconUrl(linkUrl: string, size = 128): string | null {
  try {
    const host = new URL(linkUrl.trim()).hostname;
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
  } catch {
    return null;
  }
}

export function requiresLoginPlaceholder(urlStr: string): boolean {
  try {
    const u = new URL(urlStr.trim());
    const host = u.hostname.toLowerCase();
    return (
      host === "figma.com" ||
      host.endsWith(".figma.com") ||
      host === "chatgpt.com" ||
      host.endsWith(".chatgpt.com") ||
      host === "openai.com" ||
      host.endsWith(".openai.com") ||
      host === "notion.so" ||
      host.endsWith(".notion.so") ||
      host === "notion.site" ||
      host.endsWith(".notion.site") ||
      host === "linear.app" ||
      host.endsWith(".linear.app") ||
      host === "slack.com" ||
      host.endsWith(".slack.com") ||
      host === "zoom.us" ||
      host.endsWith(".zoom.us") ||
      host === "zoom.com" ||
      host.endsWith(".zoom.com") ||
      host === "miro.com" ||
      host.endsWith(".miro.com") ||
      host === "canva.com" ||
      host.endsWith(".canva.com") ||
      host === "dropbox.com" ||
      host.endsWith(".dropbox.com") ||
      host.endsWith("sharepoint.com") ||
      host === "onedrive.live.com" ||
      host === "teams.live.com" ||
      host.includes("teams.microsoft") ||
      // Auth LMS / ebook readers — screenshots capture "please wait" interstitials.
      host === "molecule.community" ||
      host.endsWith(".molecule.community")
    );
  } catch {
    return false;
  }
}

export function effectivePreviewImageUrl(link: {
  imageUrl: string | null;
  url: string;
}): string {
  if (requiresLoginPlaceholder(link.url)) {
    return "/placeholder-unicorn.jpg";
  }
  // thum.io / mShots are slow or placeholder-heavy — never surface those live.
  const stored = isUnreliableScreenshotUrl(link.imageUrl)
    ? null
    : link.imageUrl;
  const branded = providerPreviewIcon(link.url, stored);
  if (branded) return branded;
  return googleFaviconUrl(link.url) ?? "";
}

export function isGoogleFaviconUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("google.com/s2/favicons");
}

function isJunkFaviconUrl(url: string): boolean {
  return /dummyimage\.com|placehold\.|via\.placeholder/i.test(url);
}

export function effectiveFaviconUrl(link: {
  faviconUrl: string | null;
  url: string;
}): string {
  const stored = link.faviconUrl?.trim();
  if (stored && !isJunkFaviconUrl(stored)) return stored;
  return googleFaviconUrl(link.url, 64) ?? "";
}

export function displayTitle(link: {
  title: string;
  customTitle: string | null;
  url: string;
}): string {
  return resolveProviderDisplayTitle({
    customTitle: link.customTitle,
    systemTitle: link.title,
    url: link.url,
  });
}

export function linkHostname(url: string): string {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function linkToApiRow(link: {
  id: string;
  url: string;
  title: string;
  customTitle: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  tags: string[];
  notes: string | null;
  groupId: string;
  metadataStatus: LinkMetadataStatus;
  createdAt: Date;
  deletedAt?: Date | null;
}): LinkApiRow {
  const favicon = effectiveFaviconUrl(link);
  const da = link.deletedAt ? link.deletedAt.toISOString() : null;
  return {
    id: link.id,
    url: link.url,
    title: link.title,
    customTitle: link.customTitle,
    description: link.description,
    imageUrl: effectivePreviewImageUrl(link),
    faviconUrl: favicon,
    tags: link.tags,
    notes: link.notes,
    groupId: link.groupId,
    metadataStatus: link.metadataStatus,
    createdAt: link.createdAt.toISOString(),
    deletedAt: da,
    displayTitle: displayTitle(link),
  };
}

export function duplicateLinkMessage(inTrash: boolean): string {
  return inTrash
    ? "This URL is in Trash. Restore it to save it again."
    : "A link with this URL already exists.";
}

/**
 * A 409 is an existing URL, including one sitting in Trash.
 * It is not a newly saved link.
 */
export function duplicateSaveError(status: number, data: unknown): string | null {
  if (status !== 409) return null;
  if (data && typeof data === "object") {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error.trim();
  }
  return duplicateLinkMessage(false);
}

export function isValidHttpUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const EXPLICIT_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Long enough for a signed download link, short enough to store and show. */
export const LINK_URL_MAX = 8_192;

/**
 * Query keys that identify a campaign, not the page.
 * `utm_*` covers the usual set. The rest are click ids from ad and share links.
 */
const TRACKING_PARAM_NAMES = new Set([
  "_ga",
  "dclid",
  "fbclid",
  "gad_campaignid",
  "gad_source",
  "gbraid",
  "gclid",
  "gclsrc",
  "igsh",
  "igshid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "ttclid",
  "twclid",
  "wbraid",
  "yclid",
]);

export function isTrackingParam(name: string): boolean {
  const key = name.toLowerCase();
  return key.startsWith("utm_") || TRACKING_PARAM_NAMES.has(key);
}

/**
 * Drop campaign parameters so the same page is not saved twice.
 * A link with none of those parameters is returned unchanged.
 */
export function withoutTrackingParams(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  const tracked = [...url.searchParams.keys()].filter((key) => isTrackingParam(key));
  if (tracked.length === 0) return raw;
  for (const key of tracked) url.searchParams.delete(key);
  if (url.pathname === "/" && !url.search && !url.hash) return url.origin;
  return url.href;
}

export const LINK_URL_HINT = "Enter a link, like example.com/page";

function urlHasCredentials(url: URL): boolean {
  return Boolean(url.username || url.password);
}

/**
 * Turn a pasted link into an http(s) URL.
 * `linear.app/docs` becomes `https://linear.app/docs`.
 * A URL that is already http(s) is kept as typed.
 * Sentences, `javascript:`, credentialed URLs, and hosts with no dot return null.
 */
export function coerceHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LINK_URL_MAX || /\s/.test(trimmed)) return null;
  if (isValidHttpUrl(trimmed)) {
    if (urlHasCredentials(new URL(trimmed))) return null;
    return withoutTrackingParams(trimmed);
  }
  if (EXPLICIT_SCHEME.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(`https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;
  if (urlHasCredentials(url)) return null;
  // A bare host gets a slash from the URL parser. Store it without one.
  if (url.pathname === "/" && !url.search && !url.hash) return url.origin;
  return withoutTrackingParams(url.href);
}

/**
 * Why a pasted link cannot be saved.
 * Null means `coerceHttpUrl` will accept it.
 */
export function linkUrlIssue(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return LINK_URL_HINT;
  if (trimmed.length > LINK_URL_MAX) return "That link is too long to save.";

  let parsed: URL | null = null;
  if (isValidHttpUrl(trimmed)) {
    parsed = new URL(trimmed);
  } else if (!EXPLICIT_SCHEME.test(trimmed)) {
    try {
      parsed = new URL(`https://${trimmed}`);
    } catch {
      parsed = null;
    }
  }
  if (parsed && urlHasCredentials(parsed)) {
    return "Remove the username and password from the link.";
  }
  if (!coerceHttpUrl(trimmed)) return LINK_URL_HINT;
  return null;
}

export function truncateUrl(url: string, max = 48): string {
  const t = url.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}
