import type { LinkMetadataStatus } from "@prisma/client";
import {
  providerPreviewIcon,
  resolveProviderDisplayTitle,
} from "@/lib/link-providers";
import { isThumIoUrl } from "@/lib/screenshot";

export type LinkApiRow = {
  id: string;
  url: string;
  /** System / metadata title (never overwritten by user rename). */
  title: string;
  custom_title: string | null;
  customTitle: string | null;
  description: string | null;
  /**
   * Preview image: stored og/twitter/icon from scrape, or Google favicon fallback
   * so the card always has a visual when the URL is valid.
   */
  image_url: string;
  /** Site favicon/logo; falls back to Google favicon by host. */
  favicon_url: string;
  faviconUrl: string;
  tags: string[];
  notes: string | null;
  group_id: string;
  groupId: string;
  /** Background metadata enrichment: pending until scrape finishes. */
  metadata_status: LinkMetadataStatus;
  created_at: string;
  createdAt: string;
  /** ISO string or null. Set when link is in Trash. */
  deleted_at: string | null;
  deletedAt: string | null;
  /** `custom_title ?? title` */
  display_title: string;
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
      host.includes("teams.microsoft")
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
  // thum.io free tier often returns solid placeholders — never surface those.
  const stored = isThumIoUrl(link.imageUrl) ? null : link.imageUrl;
  const branded = providerPreviewIcon(link.url, stored);
  if (branded) return branded;
  return googleFaviconUrl(link.url) ?? "";
}

export function isGoogleFaviconUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("google.com/s2/favicons");
}

export function effectiveFaviconUrl(link: {
  faviconUrl: string | null;
  url: string;
}): string {
  const stored = link.faviconUrl?.trim();
  if (stored) return stored;
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
    custom_title: link.customTitle,
    customTitle: link.customTitle,
    description: link.description,
    image_url: effectivePreviewImageUrl(link),
    favicon_url: favicon,
    faviconUrl: favicon,
    tags: link.tags,
    notes: link.notes,
    group_id: link.groupId,
    groupId: link.groupId,
    metadata_status: link.metadataStatus,
    created_at: link.createdAt.toISOString(),
    createdAt: link.createdAt.toISOString(),
    deleted_at: da,
    deletedAt: da,
    display_title: displayTitle(link),
  };
}

export function isValidHttpUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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
