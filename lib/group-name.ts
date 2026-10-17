/** Long enough for a real collection name, short enough to read on a pill. */
export const GROUP_NAME_MAX = 60;

export const GROUP_NAME_TAKEN = "A group with this name already exists.";

/** Names the library already uses for the inbox, whatever the stored spelling is. */
const RESERVED_GROUP_NAMES = new Set(["all", "general", "uncategorized"]);

export const GROUP_NAME_RESERVED =
  "All is your whole library. Pick a different name.";

export const GROUP_NAME_IN_TRASH =
  "That name is in Trash. Restore the group, or pick a different name.";

export type NamedGroup = {
  name: string;
  deletedAt: Date | string | null;
};

/**
 * Whether this name is already used, ignoring letter case.
 * An active group wins over one sitting in Trash.
 */
export function groupNameConflict(
  name: string,
  groups: readonly NamedGroup[],
): "active" | "trash" | null {
  const target = name.trim().toLowerCase();
  if (!target) return null;
  let inTrash = false;
  for (const group of groups) {
    if (group.name.trim().toLowerCase() !== target) continue;
    if (group.deletedAt == null) return "active";
    inTrash = true;
  }
  return inTrash ? "trash" : null;
}

export function groupNameConflictMessage(
  kind: "active" | "trash" | null,
): string | null {
  if (kind === "active") return GROUP_NAME_TAKEN;
  if (kind === "trash") return GROUP_NAME_IN_TRASH;
  return null;
}

/** Why a group name cannot be saved, or null when it can. */
export function groupNameIssue(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Group name cannot be empty";
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return "Group names can't include line breaks.";
  }
  if (trimmed.length > GROUP_NAME_MAX) {
    return `Group names must be ${GROUP_NAME_MAX} characters or fewer.`;
  }
  if (RESERVED_GROUP_NAMES.has(trimmed.toLowerCase())) return GROUP_NAME_RESERVED;
  return null;
}
