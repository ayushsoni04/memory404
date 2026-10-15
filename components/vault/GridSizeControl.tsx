"use client";

import { playUiSound } from "@/lib/ui-sound";
import { nextGridSize } from "./grid-size";
import { GRID_SIZES, controlPress, type GridSize } from "./types";

export function GridSizeControl({
  gridSize,
  setGridSizeAndPersist,
}: {
  gridSize: GridSize;
  setGridSizeAndPersist: (size: GridSize) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Grid layout"
      className="flex items-center gap-[var(--layout-gap-item)]"
    >
      {GRID_SIZES.map((opt) => {
        const active = gridSize === opt.id;
        return (
          <button
            key={opt.id}
            id={`grid-size-${opt.id}`}
            type="button"
            role="radio"
            title={opt.title}
            aria-label={opt.title}
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => {
              setGridSizeAndPersist(opt.id);
              playUiSound("toggle");
            }}
            onKeyDown={(event) => {
              const next = nextGridSize(gridSize, event.key);
              if (!next) return;
              event.preventDefault();
              setGridSizeAndPersist(next);
              playUiSound("toggle");
              document.getElementById(`grid-size-${next}`)?.focus();
            }}
            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[12px] font-medium leading-none ${controlPress} ${
              active
                ? "bg-pill-active text-pill-active-fg"
                : "bg-pill text-muted hover:bg-pill-hover hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
