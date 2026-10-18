import type { Filter } from "mongodb";
import { escapeMongoRegex } from "@/lib/db/mongodb";
import type { LinkDocument } from "@/lib/db/types";

const SEARCH_SEPARATOR = /[-_/\s]/;

/**
 * Pattern for a saved-page search.
 * "side-projects" also matches "side projects", "side_projects", and "side/projects".
 * A query with none of those separators stays a literal.
 */
export function linkSearchPattern(query: string): string {
  const q = query.trim();
  if (!SEARCH_SEPARATOR.test(q)) return escapeMongoRegex(q);
  const parts = q
    .split(/[-_/\s]+/)
    .filter(Boolean)
    .map((part) => escapeMongoRegex(part));
  if (parts.length < 2) return parts[0] ?? escapeMongoRegex(q);
  return parts.join("[-_/\\s]+");
}

/**
 * Prepared filter for full-text style search across stored metadata.
 * Wire to GET /api/links when you add a `q` query param.
 */
export function linkTextSearchWhere(query: string): Filter<LinkDocument> {
  const q = query.trim();
  if (!q) return {};
  const contains = { $regex: linkSearchPattern(q), $options: "i" };
  return {
    $or: [
      { title: contains },
      { customTitle: contains },
      { description: contains },
      { url: contains },
      { notes: contains },
      { tags: contains },
    ],
  };
}
