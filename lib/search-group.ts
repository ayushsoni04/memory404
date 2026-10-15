import { GENERAL_GROUP_NAME } from "@/lib/group-constants";

const INBOX_NAMES = new Set([
  GENERAL_GROUP_NAME.toLowerCase(),
  "uncategorized",
  "all",
]);

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
