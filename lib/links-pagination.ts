import { Prisma } from "@prisma/client";
import { linkToApiRow, type LinkApiRow } from "@/lib/links";

export const LINKS_PAGE_DEFAULT = 24;
export const LINKS_PAGE_MAX = 100;

export type LinksPageResult = {
  links: LinkApiRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function encodeLinkCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    `${createdAt.toISOString()}::${id}`,
    "utf8",
  ).toString("base64url");
}

export function decodeLinkCursor(
  cursor: string,
): { createdAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const sep = raw.indexOf("::");
    if (sep <= 0) return null;
    const iso = raw.slice(0, sep);
    const id = raw.slice(sep + 2);
    if (!iso || !id) return null;
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export function parseLinksLimit(raw: string | null | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return LINKS_PAGE_DEFAULT;
  return Math.min(Math.floor(n), LINKS_PAGE_MAX);
}

/** Cursor clause for newest-first pages (`createdAt DESC, id DESC`). */
export function linksCursorWhere(
  cursor: { createdAt: Date; id: string } | null,
): Prisma.LinkWhereInput {
  if (!cursor) return {};
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      {
        AND: [
          { createdAt: cursor.createdAt },
          { id: { lt: cursor.id } },
        ],
      },
    ],
  };
}

export function toLinksPage(
  rows: Parameters<typeof linkToApiRow>[0][],
  limit: number,
): LinksPageResult {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    links: page.map(linkToApiRow),
    nextCursor:
      hasMore && last
        ? encodeLinkCursor(last.createdAt, last.id)
        : null,
    hasMore,
  };
}
