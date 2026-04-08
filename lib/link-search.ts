import type { Prisma } from "@prisma/client";

/**
 * Prepared filter for full-text style search across stored metadata.
 * Wire to GET /api/links when you add a `q` query param.
 */
export function linkTextSearchWhere(query: string): Prisma.LinkWhereInput {
  const q = query.trim();
  if (!q) return {};
  return {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { customTitle: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { url: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ],
  };
}
