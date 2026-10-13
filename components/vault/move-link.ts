import type { LinkApiRow } from "@/lib/links";

/** All still contains a link after it moves. A specific group only keeps it when it lands there. */
export function linkStaysInOpenGroup(
  openedGroupId: string | null,
  nextGroupId: string,
): boolean {
  return !openedGroupId || openedGroupId === "all" || openedGroupId === nextGroupId;
}

export function cacheAfterMove(
  prev: Record<string, LinkApiRow[]>,
  linkId: string,
  updated: LinkApiRow,
): Record<string, LinkApiRow[]> {
  const nextGroupId = updated.groupId;
  const next: Record<string, LinkApiRow[]> = {};
  let changed = false;

  for (const key of Object.keys(prev)) {
    const list = prev[key];
    if (!list.some((item) => item.id === linkId)) {
      next[key] = list;
      continue;
    }
    changed = true;
    if (key !== "all" && key !== nextGroupId) {
      next[key] = list.filter((item) => item.id !== linkId);
    } else {
      next[key] = list.map((item) => (item.id === linkId ? updated : item));
    }
  }

  if (next[nextGroupId] && !next[nextGroupId].some((item) => item.id === linkId)) {
    changed = true;
    next[nextGroupId] = [
      updated,
      ...next[nextGroupId].filter((item) => item.id !== linkId),
    ];
  }

  return changed ? next : prev;
}
