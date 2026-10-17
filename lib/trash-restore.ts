export const LINK_NOT_IN_TRASH = "That link is not in Trash.";

export const LINK_ALREADY_SAVED =
  "This page is already in your library. Leave this copy in Trash, or delete the other one.";

export const GROUP_NOT_IN_TRASH = "That group is not in Trash.";

export const GROUP_RESTORE_TAKEN =
  "A group with this name is already in your library. Rename it, then restore this one.";

export type RestoreIssue = {
  status: number;
  message: string;
};

/** Why a trashed link cannot come back, or null when restore can proceed. */
export function linkRestoreIssue(input: {
  found: boolean;
  inTrash: boolean;
  urlTaken: boolean;
}): RestoreIssue | null {
  if (!input.found || !input.inTrash) {
    return { status: 404, message: LINK_NOT_IN_TRASH };
  }
  if (input.urlTaken) return { status: 409, message: LINK_ALREADY_SAVED };
  return null;
}

/** Name of the library group that blocks this restore, wrapped for the message. */
export function groupRestoreMessage(activeName: string): string {
  const label = activeName.trim();
  if (!label) return GROUP_RESTORE_TAKEN;
  return `“${label}” is already in your library. Rename that group, then restore this one.`;
}

/** Why a trashed group cannot come back, or null when restore can proceed. */
export function groupRestoreIssue(input: {
  found: boolean;
  inTrash: boolean;
  activeName: string | null;
}): RestoreIssue | null {
  if (!input.found || !input.inTrash) {
    return { status: 404, message: GROUP_NOT_IN_TRASH };
  }
  if (input.activeName) {
    return { status: 409, message: groupRestoreMessage(input.activeName) };
  }
  return null;
}
