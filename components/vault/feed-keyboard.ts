const FEED_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

/** True when arrow keys belong to a text field, not the surrounding widget. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
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
      type === "file" ||
      type === "range" ||
      type === "color"
    ) {
      return false;
    }
  }
  return true;
}

export function isFeedArrowKey(key: string): boolean {
  return FEED_KEYS.has(key);
}

/** Next card in reading order. Arrows move one card; Home and End jump. */
export function nextFeedCardIndex(
  current: number,
  key: string,
  count: number,
): number | null {
  if (count <= 0 || current < 0 || current >= count) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return Math.min(count - 1, current + 1);
  if (key === "ArrowLeft" || key === "ArrowUp") return Math.max(0, current - 1);
  return null;
}

/** Next option in a closed list. Stops at the ends. */
export function nextOptionIndex(
  current: number,
  key: string,
  count: number,
): number | null {
  if (count <= 0) return null;
  const index = current < 0 ? 0 : current;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowDown") return Math.min(count - 1, index + 1);
  if (key === "ArrowUp") return Math.max(0, index - 1);
  return null;
}
