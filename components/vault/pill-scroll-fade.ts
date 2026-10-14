export type PillScrollEdges = {
  /** Hidden content sits before the current scroll position. */
  start: boolean;
  /** Hidden content sits after the current scroll position. */
  end: boolean;
};

/**
 * Which ends of a horizontal scroller should fade. A 1px slop ignores
 * subpixel rounding when the row already fits.
 */
export function horizontalScrollEdges(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
): PillScrollEdges {
  const hidden = scrollWidth - clientWidth;
  if (hidden <= 1) return { start: false, end: false };
  return {
    start: scrollLeft > 1,
    end: scrollLeft < hidden - 1,
  };
}
