"use client";

import { applyArtStyle, type ArtStyle } from "@/lib/art-style";
import { playUiSound } from "@/lib/ui-sound";
import { useArtStyle } from "@/lib/use-art-style";

const ITERATIONS: { style: ArtStyle; label: string; title: string }[] = [
  { style: "signal", label: "Signal", title: "Eclipse poster, in colour" },
  { style: "mono", label: "Mono", title: "Signal layout without the colours" },
];

/** Sidebar switch between the design iterations. */
export function IterationsPicker({ className = "" }: { className?: string }) {
  const art = useArtStyle();

  return (
    <div className={`flex flex-col gap-1.5 px-2.5 ${className}`}>
      <span id="iterations-label" className="text-[13px] text-muted">
        Iterations
      </span>
      <div
        role="radiogroup"
        aria-labelledby="iterations-label"
        className="grid grid-cols-2 gap-1 rounded-full bg-pill p-0.5"
      >
        {ITERATIONS.map(({ style, label, title }) => {
          const active = art === style;
          return (
            <button
              key={style}
              type="button"
              role="radio"
              aria-checked={active}
              title={title}
              onClick={() => {
                if (active) return;
                applyArtStyle(style);
                playUiSound("toggle");
              }}
              className={`h-7 rounded-full text-[12px] transition-colors duration-[160ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] ${
                active
                  ? "bg-pill-active font-medium text-pill-active-fg"
                  : "text-muted hover:bg-pill-hover hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
