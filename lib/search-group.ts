import { GENERAL_GROUP_NAME } from "@/lib/group-constants";

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
