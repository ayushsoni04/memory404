/** Shown instead of zero counters when the account has not saved a link. */
export const EMPTY_LIBRARY_STATS = {
  title: "No links yet",
  body: "Save a link in the library and it will show up here — how many you have, which groups hold them, and the days you added them.",
  action: "Go to your library",
  href: "/",
} as const;

export function isEmptyLibraryStats(totalLinks: number): boolean {
  return totalLinks === 0;
}

/** Density list when there are links but no groups came back. */
export const EMPTY_GROUP_DENSITY = "No groups yet.";
