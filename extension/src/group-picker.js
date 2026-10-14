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
 * Enter picks the highlighted group, an exact name, or creates the typed name.
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
    if (hasQuery) return { type: "create" };
    return { type: "noop" };
  }
  if (key === "Escape") return { type: "close" };
  return { type: "noop" };
}
