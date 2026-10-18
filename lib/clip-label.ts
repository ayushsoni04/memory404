/** One line of a typed query, short enough to stay inside a menu. */
export function clipLabel(value: string, max = 48): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1))}…`;
}
