import type { LinkApiRow } from "@/lib/links";
import { explainLoadError, UNREACHABLE_MESSAGE } from "@/lib/load-error";

/** How long an undo stays available. Trash remains the later way back. */
export const UNDO_MS = 10_000;

/** Whole seconds still left in the undo window. */
export function undoSecondsLeft(elapsedMs: number): number {
  const left = Math.max(0, UNDO_MS - Math.max(0, elapsedMs));
  return Math.ceil(left / 1000);
}

/** The undo chord, written the way the current platform shows it. */
export function undoShortcutLabel(platform: string): string {
  return /Mac|iPhone|iPad/i.test(platform) ? "⌘Z" : "Ctrl+Z";
}

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

export const MOVE_FAILED = "Couldn't move that link. Try again.";

/** Sentence for a move that did not stick. A dropped request uses the offline message. */
export function moveFailureNotice(data: unknown, offline = false): string {
  if (offline) return UNREACHABLE_MESSAGE;
  const error =
    data && typeof data === "object" ? (data as { error?: unknown }).error : null;
  const raw = typeof error === "string" && error.trim() ? error.trim() : MOVE_FAILED;
  return explainLoadError(raw) ?? MOVE_FAILED;
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
