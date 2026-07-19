"use client";

import { Masonry } from "masonic";
import {
  applyVicinityCardStrokes,
  clearVicinityCardStrokes,
} from "@/lib/card-vicinity-stroke";
import type { LinkApiRow } from "@/lib/links";
import type { GridSize } from "./types";

export type FeedItem =
  | { kind: "add-link" }
  | { kind: "link"; link: LinkApiRow; priority: boolean };

/** Horizontal gap between columns, in px — mirrors the old `.mind-grid` column-gap per size. */
const COLUMN_GUTTER_BY_SIZE: Record<GridSize, number> = {
  compact: 12,
  default: 12,
  large: 16,
};

/** Vertical gap between stacked cards, in px — mirrors the old `.mind-card`'s `mb-3`. */
const ROW_GUTTER = 12;

type FeedGridProps = {
  gridSize: GridSize;
  columnCount: number;
  items: FeedItem[];
  itemKey: (data: FeedItem) => string;
  render: (props: {
    index: number;
    width: number;
    data: FeedItem;
  }) => React.ReactNode;
};

/**
 * Client-only: masonic touches `ResizeObserver` on mount, which doesn't exist
 * during Next.js server rendering, so this is loaded via `next/dynamic` with
 * `ssr: false` from VaultFeed.
 */
export default function FeedGrid({
  gridSize,
  columnCount,
  items,
  itemKey,
  render,
}: FeedGridProps) {
  return (
    <div
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
      <Masonry<FeedItem>
        items={items}
        columnCount={columnCount}
        columnGutter={COLUMN_GUTTER_BY_SIZE[gridSize]}
        rowGutter={ROW_GUTTER}
        itemHeightEstimate={260}
        overscanBy={2}
        itemKey={itemKey}
        render={render}
      />
    </div>
  );
}
