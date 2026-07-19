"use client";

import { useEffect, useState } from "react";
import type { GridSize } from "./types";

/** Mirrors the Tailwind breakpoints the old `.mind-grid` CSS-columns layout used. */
const BREAKPOINTS = [640, 768, 1024, 1280, 1536] as const;

/** Column count at [base, >=640, >=768, >=1024, >=1280, >=1536] per grid size. */
const COLUMNS_BY_SIZE: Record<GridSize, number[]> = {
  compact: [1, 3, 4, 5, 6, 7],
  default: [1, 2, 3, 4, 5, 6],
  large: [1, 1, 2, 2, 3, 3],
};

function computeColumnCount(gridSize: GridSize, width: number): number {
  const columns = COLUMNS_BY_SIZE[gridSize];
  let count = columns[0];
  for (let i = 0; i < BREAKPOINTS.length; i++) {
    if (width >= BREAKPOINTS[i]) count = columns[i + 1];
  }
  return count;
}

/** Column count for the virtualized masonry feed, responsive to viewport width like the old CSS breakpoints. */
export function useResponsiveColumnCount(gridSize: GridSize): number {
  const [width, setWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return computeColumnCount(gridSize, width);
}
