"use client";

import { useRef, useState } from "react";
import {
  activityDayLabel,
  nextActivityCell,
  type ActivityCount,
} from "@/lib/activity-grid";
import { STATS_ACTIVITY_LABEL } from "@/lib/stats-scope";

function cellColor(count: number): string {
  if (count >= 4) return "bg-neutral-100 border border-white shadow-[0_0_8px_rgba(255,255,255,0.6)]";
  if (count >= 2) return "bg-neutral-500 border border-neutral-400/50";
  if (count === 1) return "bg-neutral-700/80 border border-neutral-600/50";
  return "bg-neutral-800/40 border border-neutral-900/30";
}

export function ActivityGrid({ cells }: { cells: ActivityCount[] }) {
  const [active, setActive] = useState(() => Math.max(0, cells.length - 1));
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const current = cells[active] ?? cells[cells.length - 1];

  const move = (key: string) => {
    const next = nextActivityCell(active, key, cells.length);
    if (next === null) return false;
    setActive(next);
    buttons.current[next]?.focus();
    return true;
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label={STATS_ACTIVITY_LABEL}
        className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onKeyDown={(event) => {
          if (!move(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {cells.map((cell, index) => (
          <button
            key={cell.date}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            tabIndex={index === active ? 0 : -1}
            aria-current={index === active ? "date" : undefined}
            aria-label={activityDayLabel(cell.date, cell.count)}
            onClick={() => {
              setActive(index);
              buttons.current[index]?.focus();
            }}
            className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <span
              aria-hidden
              className={`size-2.5 rounded-sm ${cellColor(cell.count)} ${
                index === active ? "ring-1 ring-foreground/70" : ""
              }`}
            />
          </button>
        ))}
      </div>
      {current ? (
        <p role="status" className="text-[12px] text-muted">
          {activityDayLabel(current.date, current.count)}
        </p>
      ) : null}
      <div className="flex items-center justify-between text-[11px] text-subtle font-mono">
        <span>
          {cells[0]
            ? new Date(`${cells[0].date}T00:00:00`).toLocaleDateString(undefined, {
                month: "short",
                year: "2-digit",
              })
            : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <div className="size-2 rounded-sm bg-neutral-800/60" />
          <div className="size-2 rounded-sm bg-neutral-600/90" />
          <div className="size-2 rounded-sm bg-neutral-400" />
          <div className="size-2 rounded-sm bg-neutral-100 shadow-[0_0_4px_rgba(255,255,255,0.7)]" />
          <span>More</span>
        </div>
        <span>Today</span>
      </div>
    </div>
  );
}
