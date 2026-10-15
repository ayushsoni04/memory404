/** Horizontal group pills. "All" is always the first stop. */
export function groupPillIds(folderIds: readonly string[]): string[] {
  return ["all", ...folderIds];
}

/** The open group, or All when the open id is missing. */
export function activeGroupPill(
  openedGroupId: string | null,
  ids: readonly string[],
): string {
  if (openedGroupId && ids.includes(openedGroupId)) return openedGroupId;
  return ids[0] ?? "all";
}

/** Next pill for a horizontal toolbar. Stops at the ends. */
export function nextGroupPill(
  currentId: string,
  ids: readonly string[],
  key: string,
): string | null {
  const index = ids.indexOf(currentId);
  if (index < 0 || ids.length === 0) return null;
  let next = index;
  if (key === "Home") next = 0;
  else if (key === "End") next = ids.length - 1;
  else if (key === "ArrowRight" || key === "ArrowDown") next = index + 1;
  else if (key === "ArrowLeft" || key === "ArrowUp") next = index - 1;
  else return null;
  if (next < 0 || next >= ids.length || next === index) return null;
  return ids[next] ?? null;
}
