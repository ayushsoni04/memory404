import type { LinkMetadataStatus } from "@prisma/client";
import {
  providerPreviewIcon,
  resolveProviderDisplayTitle,
} from "@/lib/link-providers";

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
  tags: string[];
  notes: string | null;
  group_id: string;
  groupId: string;
  /** Background metadata enrichment: pending until scrape finishes. */
  metadata_status: LinkMetadataStatus;
  created_at: string;
  createdAt: string;
  /** `custom_title ?? title` */
  display_title: string;
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

export function effectivePreviewImageUrl(link: {
  imageUrl: string | null;
  url: string;
}): string {
  const branded = providerPreviewIcon(link.url, link.imageUrl);
  if (branded) return branded;
  return googleFaviconUrl(link.url) ?? "";
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

export function linkToApiRow(link: {
  id: string;
  url: string;
  title: string;
  customTitle: string | null;
  description: string | null;
  imageUrl: string | null;
  tags: string[];
  notes: string | null;
  groupId: string;
  metadataStatus: LinkMetadataStatus;
  createdAt: Date;
}): LinkApiRow {
  return {
    id: link.id,
    url: link.url,
    title: link.title,
    custom_title: link.customTitle,
    customTitle: link.customTitle,
    description: link.description,
    image_url: effectivePreviewImageUrl(link),
    tags: link.tags,
    notes: link.notes,
    group_id: link.groupId,
    groupId: link.groupId,
    metadata_status: link.metadataStatus,
    created_at: link.createdAt.toISOString(),
    createdAt: link.createdAt.toISOString(),
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
