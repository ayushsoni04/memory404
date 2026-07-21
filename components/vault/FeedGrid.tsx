"use client";

import type { ReactNode } from "react";
import {
  applyVicinityCardStrokes,
  clearVicinityCardStrokes,
} from "@/lib/card-vicinity-stroke";
import type { GridSize } from "./types";

type FeedGridProps = {
  gridSize: GridSize;
  children: ReactNode;
};

export default function FeedGrid({
  gridSize,
  children,
}: FeedGridProps) {
  return (
    <div
      className="mind-grid"
      data-grid-size={gridSize}
      onPointerMove={(e) => {
        const grid = e.currentTarget as HTMLDivElement & {
          __strokeX?: number;
          __strokeY?: number;
        };
        grid.__strokeX = e.clientX;
        grid.__strokeY = e.clientY;
        if (grid.dataset.strokeRaf) return;
        grid.dataset.strokeRaf = "1";
        requestAnimationFrame(() => {
          delete grid.dataset.strokeRaf;
          applyVicinityCardStrokes(
            grid,
            grid.__strokeX ?? 0,
            grid.__strokeY ?? 0,
          );
        });
      }}
      onPointerLeave={(e) => {
        clearVicinityCardStrokes(e.currentTarget);
      }}
    >
      {children}
    </div>
  );
}
