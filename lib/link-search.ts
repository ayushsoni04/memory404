import type { Filter } from "mongodb";
import { escapeMongoRegex } from "@/lib/db/mongodb";
import type { LinkDocument } from "@/lib/db/types";

/**
 * Prepared filter for full-text style search across stored metadata.
 * Wire to GET /api/links when you add a `q` query param.
 */
export function linkTextSearchWhere(query: string): Filter<LinkDocument> {
  const q = query.trim();
  if (!q) return {};
  const contains = { $regex: escapeMongoRegex(q), $options: "i" };
  return {
    $or: [
      { title: contains },
      { customTitle: contains },
      { description: contains },
      { url: contains },
      { notes: contains },
    ],
  };
}
