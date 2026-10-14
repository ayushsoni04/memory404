export const MISSING_GROUP_NOTICE =
  "That group is no longer here. Showing all links.";

/**
 * An unknown group id in the URL should open All once the group list is known.
 * Wait while groups are still loading, and while a new group is being created.
 */
export function resolveOpenedGroup(input: {
  openedGroupId: string | null;
  groupIds: string[];
  groupsReady: boolean;
  creatingGroup: boolean;
}): string | null {
  const { openedGroupId, groupIds, groupsReady, creatingGroup } = input;
  if (!openedGroupId || openedGroupId === "all") return openedGroupId;
  if (!groupsReady || creatingGroup) return openedGroupId;
  if (groupIds.includes(openedGroupId)) return openedGroupId;
  return "all";
}
