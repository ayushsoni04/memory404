/** Weeks shown in the link-activity calendar. Columns are weeks, rows are days. */
export const ACTIVITY_WEEKS = 26;
export const ACTIVITY_ROWS = 7;

export type ActivityCount = {
  date: string;
  count: number;
};

/**
 * Calendar day in local time, `YYYY-MM-DD`.
 * UTC would move an evening save onto the next day for anyone west of Greenwich.
 */
export function activityDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** IANA zone from the viewer, or UTC when the value is missing or not a real zone. */
export function activityTimeZone(raw: string | null | undefined): string {
  const value = raw?.trim() ?? "";
  if (!value) return "UTC";
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}

/** One cell per day, oldest first, ending on `today`. */
export function buildActivityCells(
  linkFrequency: ActivityCount[],
  today = new Date(),
): ActivityCount[] {
  const totalDays = ACTIVITY_WEEKS * ACTIVITY_ROWS;
  const start = new Date(today);
  start.setDate(today.getDate() - totalDays + 1);
  const counts = new Map(linkFrequency.map((entry) => [entry.date, entry.count]));
  const cells: ActivityCount[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < totalDays; i += 1) {
    const date = activityDateKey(cursor);
    cells.push({ date, count: counts.get(date) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

/** Readable day summary. Replaces a hover-only tooltip. */
export function activityDayLabel(date: string, count: number): string {
  const formatted = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${count} link${count === 1 ? "" : "s"} added on ${formatted}`;
}

/**
 * Arrow keys through the calendar. Down and up stay in the week.
 * Left and right move to the same weekday in the next or previous week.
 * Stops at the edges.
 */
export function nextActivityCell(
  current: number,
  key: string,
  total: number,
): number | null {
  if (total <= 0 || current < 0 || current >= total) return null;
  const row = current % ACTIVITY_ROWS;
  if (key === "Home") return current === 0 ? null : 0;
  if (key === "End") return current === total - 1 ? null : total - 1;
  if (key === "ArrowDown") {
    return row < ACTIVITY_ROWS - 1 && current + 1 < total ? current + 1 : null;
  }
  if (key === "ArrowUp") return row > 0 ? current - 1 : null;
  if (key === "ArrowRight") {
    return current + ACTIVITY_ROWS < total ? current + ACTIVITY_ROWS : null;
  }
  if (key === "ArrowLeft") {
    return current - ACTIVITY_ROWS >= 0 ? current - ACTIVITY_ROWS : null;
  }
  return null;
}
