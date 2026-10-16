/** Library counts ignore Trash. Activity still includes a link you later deleted. */
export function activeLibraryMatch(userId: string): {
  userId: string;
  deletedAt: null;
} {
  return { userId, deletedAt: null };
}

export const STATS_LINK_CAPTION = "Still in your library. Trash is not counted.";

export const STATS_GROUP_CAPTION = "Groups you can open. Trash is not counted.";
