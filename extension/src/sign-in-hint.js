/**
 * What signing in will save, so a multi-tab save is not described as one tab.
 * @param {{ saveMode?: string, selectedCount?: number, groupTitle?: string }} [input]
 */
export function signInSaveHint({
  saveMode = "active",
  selectedCount = 0,
  groupTitle = "",
} = {}) {
  const lead = "After you sign in, pick a group or type a new name.";
  if (saveMode === "remember") {
    return `${lead} This saves the page you asked to remember.`;
  }
  const count = Number(selectedCount) || 0;
  if (saveMode === "selected" && count > 1) {
    return `${lead} This saves the ${count} tabs you selected.`;
  }
  if (saveMode === "group") {
    const title = String(groupTitle || "").trim();
    return title
      ? `${lead} This saves the “${title}” tab group.`
      : `${lead} This saves the tab group.`;
  }
  return `${lead} This saves the current tab.`;
}
