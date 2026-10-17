import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { groupsMatchingQuery } from "@/lib/group-query";

const INBOX_NAMES = new Set([
  GENERAL_GROUP_NAME.toLowerCase(),
  "uncategorized",
  "all",
]);

/**
 * Groups offered as jump targets.
 * The stored inbox is named General, but the library calls that place All,
 * so the palette lists All once and leaves General out.
 */
export function commandPaletteJumpGroups(
  groups: readonly { id: string; name: string }[],
): { id: string; name: string }[] {
  const rest = groups.filter(
    (group) =>
      group.id !== "all" &&
      group.name.trim().toLowerCase() !== GENERAL_GROUP_NAME.toLowerCase(),
  );
  return [
    { id: "all", name: "All" },
    ...rest.map((group) => ({ id: group.id, name: group.name })),
  ];
}

/** The name to show for a group. The stored inbox is General; the library calls it All. */
export function libraryGroupLabel(name: string | null | undefined): string | null {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return null;
  if (INBOX_NAMES.has(trimmed.toLowerCase())) return "All";
  return trimmed;
}

const INBOX_SEARCH_ROW = { id: "all", name: "All" };

/**
 * Folder search leaves the inbox out, because that pill is always first.
 * A query for All should still jump there.
 */
export function withInboxInGroupSearch<T extends { id: string; name: string }>(
  matchedFolders: readonly T[],
  query: string,
): Array<T | typeof INBOX_SEARCH_ROW> {
  const q = query.trim();
  if (!q) return [...matchedFolders];
  if (matchedFolders.some((group) => group.id === "all")) return [...matchedFolders];
  if (!groupsMatchingQuery([INBOX_SEARCH_ROW], q).length) return [...matchedFolders];
  return [INBOX_SEARCH_ROW, ...matchedFolders];
}

/** The group name to show under a search hit, using the library's "All" label. */
export function searchResultGroupLabel(
  groupId: string,
  groups: readonly { id: string; name: string }[],
): string | null {
  const name = groups.find((group) => group.id === groupId)?.name.trim();
  if (!name) return null;
  if (INBOX_NAMES.has(name.toLowerCase())) return "All";
  return name;
}

/**
 * Escape in the group field.
 * Text in the field is cleared first. An empty open menu just closes.
 */
export function groupSearchEscapeAction(
  query: string,
  menuOpen: boolean,
): "clear" | "close" | "ignore" {
  if (query.length > 0) return "clear";
  if (menuOpen) return "close";
  return "ignore";
}
