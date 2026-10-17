/** Shown instead of zero counters when the account has not saved a link. */
export const EMPTY_LIBRARY_STATS = {
  title: "No links yet",
  body: "Save a link in the library and it will show up here — how many you have, which groups hold them, and the days you added them.",
  action: "Go to your library",
  href: "/",
} as const;

/** Shown when the counters are zero because every link is in Trash. */
export const TRASHED_LIBRARY_STATS = {
  title: "Your links are in Trash",
  body: "Nothing is in the library right now. Restore a link and it will show up here again.",
  action: "Open Trash",
  href: "/trash",
} as const;

/**
 * What to show when the library has no links.
 * Trash is a different empty state from an account that has never saved one.
 */
export function libraryStatsEmptyState(
  totalLinks: number,
  trashedLinks = 0,
): typeof EMPTY_LIBRARY_STATS | typeof TRASHED_LIBRARY_STATS | null {
  if (totalLinks > 0) return null;
  if (trashedLinks > 0) return TRASHED_LIBRARY_STATS;
  return EMPTY_LIBRARY_STATS;
}

/** Density list when there are links but no groups came back. */
export const EMPTY_GROUP_DENSITY = "No groups yet.";
