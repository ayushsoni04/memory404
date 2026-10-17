import {
  explainLoadError,
  SESSION_EXPIRED_MESSAGE,
  UNREACHABLE_MESSAGE,
} from "@/lib/load-error";

/** Stop a runaway export. A normal library finishes long before this. */
export const LIBRARY_BACKUP_PAGE_CAP = 500;

export const LIBRARY_BACKUP_TOO_LARGE =
  "This library is too large to download in one backup.";

export const LIBRARY_EXPORT_FAILED = "Could not export your links. Try again.";

/**
 * A backup that did not download.
 * A dead session and a dropped connection say what to do. Other failures stay general.
 */
export function libraryExportError(message: string | null | undefined): string {
  const explained = explainLoadError(message);
  if (explained === SESSION_EXPIRED_MESSAGE || explained === UNREACHABLE_MESSAGE) {
    return explained;
  }
  return LIBRARY_EXPORT_FAILED;
}

export type LibraryLinkPage = {
  links: unknown[];
  hasMore?: boolean;
  nextCursor?: string | null;
};

/**
 * Walk the link pages until the library ends.
 * `truncated` means the page cap was hit while more links remained, so the
 * caller must not offer a partial file as a complete backup.
 */
export async function collectLibraryLinks(
  fetchPage: (cursor: string | null) => Promise<LibraryLinkPage>,
  maxPages = LIBRARY_BACKUP_PAGE_CAP,
): Promise<{ links: unknown[]; truncated: boolean }> {
  const links: unknown[] = [];
  let cursor: string | null = null;
  const limit = Math.max(1, maxPages);
  for (let page = 0; page < limit; page += 1) {
    const data = await fetchPage(cursor);
    if (Array.isArray(data.links)) links.push(...data.links);
    const nextCursor =
      typeof data.nextCursor === "string" && data.nextCursor ? data.nextCursor : null;
    if (!data.hasMore || !nextCursor) return { links, truncated: false };
    cursor = nextCursor;
  }
  return { links, truncated: true };
}

/**
 * Name the file for the viewer's calendar day.
 * UTC would date an evening export as tomorrow for anyone west of Greenwich.
 */
export function libraryBackupFilename(now = new Date(), timeZone?: string): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `memory404-backup-${day}.json`;
}

/** A backup someone can read later: which groups exist, then the links. */
export function libraryBackupPayload(
  groups: unknown[],
  links: unknown[],
  now = new Date(),
) {
  return {
    exportedAt: now.toISOString(),
    groups,
    links,
  };
}
