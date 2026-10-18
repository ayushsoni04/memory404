/** Library counts ignore Trash. Activity still includes a link you later deleted. */
export function activeLibraryMatch(userId: string): {
  userId: string;
  deletedAt: null;
} {
  return { userId, deletedAt: null };
}

/** Links sitting in Trash. Used only to explain an empty library. */
export function trashedLibraryMatch(userId: string): {
  userId: string;
  deletedAt: { $ne: null };
} {
  return { userId, deletedAt: { $ne: null } };
}

export const STATS_LINK_CAPTION = "Still in your library. Trash is not counted.";

export const STATS_GROUP_CAPTION = "Groups you can open. Trash is not counted.";

/** Heading for the year of days a link was saved. */
export const STATS_ACTIVITY_LABEL = "Days you added links";

/** Heading for the bars that show how many links sit in each group. */
export const STATS_GROUPS_LABEL = "Links in each group";

/** The sentence under the Stats heading. */
export const STATS_INTRO =
  "See how many links you have saved, which groups hold them, and the days you added them.";
