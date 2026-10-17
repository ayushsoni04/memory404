import { groupNamesMatchExactly, normalizeGroupQuery } from "./group-query.js";

const INBOX_NAMES = new Set(["all", "general", "uncategorized"]);

/**
 * The library group a browser tab group should save into.
 * Hyphens and extra spaces match. All, General, and Uncategorized mean the inbox.
 * @param {unknown} groups
 * @param {unknown} title
 */
export function libraryGroupForTitle(groups, title) {
  const list = Array.isArray(groups)
    ? groups.filter((group) => group && group.id && typeof group.name === "string")
    : [];
  const exact = list.find((group) => groupNamesMatchExactly(group.name, title));
  if (exact) return exact;
  if (!INBOX_NAMES.has(normalizeGroupQuery(title))) return null;
  return list.find((group) => INBOX_NAMES.has(normalizeGroupQuery(group.name))) ?? null;
}

/** Arrow keys through the save panel's group list. Stops at the ends. */
export function nextGroupHighlight(current, key, count) {
  if (count <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowDown") {
    if (current < 0) return 0;
    return Math.min(count - 1, current + 1);
  }
  if (key === "ArrowUp") {
    if (current < 0) return count - 1;
    return Math.max(0, current - 1);
  }
  return null;
}

/**
 * Combobox keys for the group field. Arrow keys move the highlight.
 * Enter picks the highlighted group, an exact name, or the only group left in the list.
 * A typed name with several matches, or none, is a new group.
 */
export function groupPickerKeyAction({
  key,
  highlight,
  count,
  hasExactMatch,
  hasQuery,
}) {
  const next = nextGroupHighlight(highlight, key, count);
  if (next !== null) return { type: "highlight", index: next };
  if (key === "Enter") {
    if (highlight >= 0 && highlight < count) return { type: "pick", index: highlight };
    if (hasExactMatch) return { type: "pick-exact" };
    if (hasQuery && count === 1) return { type: "pick", index: 0 };
    if (hasQuery) return { type: "create" };
    return { type: "noop" };
  }
  if (key === "Escape") return { type: "close" };
  return { type: "noop" };
}

/**
 * The group a save should use.
 * An explicit new name wins, then a chosen row, an exact name, and the only
 * group still in the list. Anything else typed is a new group.
 * @param {{
 *   selected?: { id: string, name: string } | null,
 *   exact?: { id: string, name: string } | null,
 *   visible?: { id: string, name: string }[],
 *   query?: unknown,
 *   createName?: unknown,
 * }} input
 */
export function chooseSaveGroup({ selected, exact, visible, query, createName }) {
  const creating = String(createName ?? "").trim();
  if (creating) return { type: "create", name: creating };
  if (selected?.id) return { type: "use", group: selected };
  if (exact?.id) return { type: "use", group: exact };
  const name = String(query ?? "").trim();
  const list = Array.isArray(visible) ? visible.filter((group) => group?.id) : [];
  if (name && list.length === 1) return { type: "use", group: list[0] };
  if (name) return { type: "create", name };
  return { type: "need-group" };
}
