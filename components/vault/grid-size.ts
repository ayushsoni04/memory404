import { GRID_SIZES, type GridSize } from "./types";

const ORDER: GridSize[] = GRID_SIZES.map((size) => size.id);

/** Next grid size in the S / M / L control. Stops at the ends. */
export function nextGridSize(current: GridSize, key: string): GridSize | null {
  const index = ORDER.indexOf(current);
  if (index < 0) return null;
  let next = index;
  if (key === "Home") next = 0;
  else if (key === "End") next = ORDER.length - 1;
  else if (key === "ArrowRight" || key === "ArrowDown") next = index + 1;
  else if (key === "ArrowLeft" || key === "ArrowUp") next = index - 1;
  else return null;
  if (next < 0 || next >= ORDER.length || next === index) return null;
  return ORDER[next] ?? null;
}
