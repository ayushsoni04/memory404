import { normalizeGroupQuery } from "@/lib/group-query";

/** Long enough for a real collection name, short enough to read on a pill. */
export const GROUP_NAME_MAX = 60;

export const GROUP_NAME_TAKEN = "A group with this name already exists.";

/** Names the library already uses for the inbox, whatever the stored spelling is. */
const RESERVED_GROUP_NAMES = new Set(["all", "general", "uncategorized"]);

export const GROUP_NAME_RESERVED =
  "All is your whole library. Pick a different name.";

export const GROUP_NAME_IN_TRASH =
  "That name is in Trash. Restore the group, or pick a different name.";

export const GROUP_NAME_NEEDS_WORD =
  "Use a name with a letter or number.";

/** Same reading as group search: letter case, hyphens, slashes, and extra spaces. */
export function groupNameKey(name: string): string {
  return normalizeGroupQuery(name);
}

export type NamedGroup = {
  name: string;
  deletedAt: Date | string | null;
};

/**
 * Whether this name is already used.
 * Letter case, hyphens, slashes, and extra spaces do not make a second group.
 * An active group wins over one sitting in Trash.
 */
export function groupNameConflict(
  name: string,
  groups: readonly NamedGroup[],
): "active" | "trash" | null {
  const target = groupNameKey(name);
  if (!target) return null;
  let inTrash = false;
  for (const group of groups) {
    if (groupNameKey(group.name) !== target) continue;
    if (group.deletedAt == null) return "active";
    inTrash = true;
  }
  return inTrash ? "trash" : null;
}

/** The live group this name would collide with, using the same reading as search. */
export function activeGroupName(
  name: string,
  groups: readonly NamedGroup[],
): string | null {
  const target = groupNameKey(name);
  if (!target) return null;
  const match = groups.find(
    (group) => group.deletedAt == null && groupNameKey(group.name) === target,
  );
  return match?.name ?? null;
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
  if (!groupNameKey(trimmed)) return GROUP_NAME_NEEDS_WORD;
  return null;
}

/**
 * Problems to show while a name is being typed.
 * An empty field stays quiet until the person tries to save it.
 * When the library's groups are passed, a name already in use is reported too.
 */
export function groupNameDraftIssue(
  name: string,
  groups?: readonly { name: string; deletedAt?: Date | string | null }[],
): string | null {
  if (!name.trim()) return null;
  const issue = groupNameIssue(name);
  if (issue) return issue;
  if (!groups) return null;
  return groupNameConflictMessage(
    groupNameConflict(
      name,
      groups.map((group) => ({
        name: group.name,
        deletedAt: group.deletedAt ?? null,
      })),
    ),
  );
}
