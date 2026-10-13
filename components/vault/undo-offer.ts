import type { LinkApiRow } from "@/lib/links";

/** How long an undo stays available. Trash remains the later way back. */
export const UNDO_MS = 10_000;

export type UndoNoticeModel = {
  token: number;
  message: string;
  error: string | null;
  busy: boolean;
  perform: (() => Promise<boolean>) | null;
};

export function deleteUndoMessage(): string {
  return "Moved to Trash";
}

export function moveUndoMessage(groupName: string): string {
  return `Moved to ${groupName}`;
}

/** Arrow and undo shortcuts belong to the field while someone is typing. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const field = target.closest("input, textarea, select, [contenteditable='true']");
  if (!field) return false;
  if (field instanceof HTMLInputElement) {
    const type = field.type;
    if (
      type === "button" ||
      type === "submit" ||
      type === "checkbox" ||
      type === "radio" ||
      type === "file"
    ) {
      return false;
    }
  }
  return true;
}

/** Put a restored link back into the All cache and its group cache. */
export function cacheWithLink(
  prev: Record<string, LinkApiRow[]>,
  link: LinkApiRow,
): Record<string, LinkApiRow[]> {
  const next: Record<string, LinkApiRow[]> = { ...prev };
  let changed = false;
  for (const key of Object.keys(next)) {
    if (key !== "all" && key !== link.groupId) continue;
    const list = next[key] ?? [];
    changed = true;
    if (list.some((item) => item.id === link.id)) {
      next[key] = list.map((item) => (item.id === link.id ? link : item));
    } else {
      next[key] = [link, ...list];
    }
  }
  return changed ? next : prev;
}
