"use client";

import type { TextSwapVariant } from "./VariantTextSwap";

export type SwapSpeed = "default" | "slow" | "fast";
export type SwapEase = "default" | "linear";
export type SwapAlign = "L" | "C" | "R";
export type SwapVariant = TextSwapVariant;

export const SPEED_MS: Record<SwapSpeed, string> = {
  default: "220ms",
  slow: "520ms",
  fast: "110ms",
};

export const EASE_VALUE: Record<SwapEase, string> = {
  default: "var(--ease-in-out)",
  linear: "linear",
};

export const ALIGN_CLASS: Record<SwapAlign, string> = {
  L: "text-left items-start",
  C: "text-center items-center",
  R: "text-right items-end",
};

export const VARIANT_LABEL: Record<SwapVariant, string> = {
  remount: "remount",
  "from-below": "from below",
  "tilt-crossfade": "tilt × fade",
};

type ChipProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "accent" | "danger";
};

export function ControlChip({
  active,
  onClick,
  children,
  tone = "default",
}: ChipProps) {
  const activeTone =
    tone === "accent"
      ? "border-amber-400/60 bg-amber-400 text-black"
      : tone === "danger"
        ? "border-danger/50 bg-danger/20 text-danger"
        : "border-foreground/40 bg-pill-active text-pill-active-fg";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
        active
          ? activeTone
          : "border-border bg-transparent text-muted hover:border-foreground/35 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

type BarProps = {
  speed: SwapSpeed;
  ease: SwapEase;
  align: SwapAlign;
  variant: SwapVariant;
  debug: boolean;
  running: boolean;
  onSpeed: (v: SwapSpeed) => void;
  onEase: (v: SwapEase) => void;
  onAlign: (v: SwapAlign) => void;
  onVariant: (v: SwapVariant) => void;
  onDebug: (v: boolean) => void;
  onToggleRun: () => void;
  compact?: boolean;
};

export function SwapControlBar({
  speed,
  ease,
  align,
  variant,
  debug,
  running,
  onSpeed,
  onEase,
  onAlign,
  onVariant,
  onDebug,
  onToggleRun,
  compact = false,
}: BarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${
        compact ? "justify-between" : "justify-between border-t border-border pt-3"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {(["remount", "from-below", "tilt-crossfade"] as const).map((id) => (
          <ControlChip
            key={id}
            active={variant === id}
            onClick={() => onVariant(id)}
          >
            {VARIANT_LABEL[id]}
          </ControlChip>
        ))}
        <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
        {(["default", "slow", "fast"] as const).map((id) => (
          <ControlChip
            key={id}
            active={speed === id}
            onClick={() => onSpeed(id)}
          >
            {id}
          </ControlChip>
        ))}
        <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
        {(["default", "linear"] as const).map((id) => (
          <ControlChip
            key={id}
            active={ease === id}
            onClick={() => onEase(id)}
          >
            {id === "default" ? "ease" : id}
          </ControlChip>
        ))}
        <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
        {(["L", "C", "R"] as const).map((id) => (
          <ControlChip
            key={id}
            active={align === id}
            onClick={() => onAlign(id)}
          >
            {id}
          </ControlChip>
        ))}
        <ControlChip active={debug} onClick={() => onDebug(!debug)}>
          Debug
        </ControlChip>
      </div>
      <ControlChip active={running} tone="accent" onClick={onToggleRun}>
        {running ? "Stop" : "Run"}
      </ControlChip>
    </div>
  );
}
