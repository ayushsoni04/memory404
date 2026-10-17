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

export type FeedCardRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function rectUsable(rect: FeedCardRect | undefined): rect is FeedCardRect {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

/** CSS columns share a left edge. Subpixels should not split one column. */
function columnKey(rect: FeedCardRect): number {
  return Math.round(rect.left / 8);
}

/**
 * Move by what is on screen.
 * The feed is columns, so Down stays in the column and Right enters the next one.
 * Returns undefined when the boxes cannot show more than one column, so the
 * caller can keep moving one card at a time.
 */
function nextCardInColumns(
  current: number,
  key: string,
  rects: readonly FeedCardRect[],
): number | null | undefined {
  if (!rects.every(rectUsable)) return undefined;
  const columns = new Map<number, number[]>();
  rects.forEach((rect, index) => {
    const id = columnKey(rect);
    const list = columns.get(id);
    if (list) list.push(index);
    else columns.set(id, [index]);
  });
  const ordered = [...columns.keys()].sort((left, right) => left - right);
  if (ordered.length < 2) return undefined;

  for (const id of ordered) {
    columns.get(id)?.sort((left, right) => rects[left].top - rects[right].top || left - right);
  }

  const currentColumn = columnKey(rects[current]);
  const columnIndex = ordered.indexOf(currentColumn);
  const column = columns.get(currentColumn) ?? [];
  const rowIndex = column.indexOf(current);
  if (columnIndex < 0 || rowIndex < 0) return undefined;

  if (key === "ArrowDown") return column[rowIndex + 1] ?? null;
  if (key === "ArrowUp") return rowIndex > 0 ? column[rowIndex - 1] ?? null : null;
  if (key !== "ArrowRight" && key !== "ArrowLeft") return undefined;

  const neighbor =
    key === "ArrowRight" ? ordered[columnIndex + 1] : ordered[columnIndex - 1];
  if (neighbor == null) return null;
  const targets = columns.get(neighbor) ?? [];
  const mid = rects[current].top + rects[current].height / 2;
  let best = targets[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const index of targets) {
    const center = rects[index].top + rects[index].height / 2;
    const distance = Math.abs(center - mid);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best ?? null;
}

/**
 * Next card in the feed.
 * With column positions, Up and Down stay in the column and Left and Right
 * change columns. A single column, or a layout that has not been measured,
 * still moves one card at a time. Home and End jump.
 */
export function nextFeedCardIndex(
  current: number,
  key: string,
  count: number,
  rects?: readonly FeedCardRect[],
): number | null {
  if (count <= 0 || current < 0 || current >= count) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (rects && rects.length === count) {
    const spatial = nextCardInColumns(current, key, rects);
    if (spatial !== undefined) return spatial;
  }
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
