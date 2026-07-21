"use client";

import { useEffect, useRef, useState } from "react";
import TextSwap from "@/components/TextSwap";
import {
  ALIGN_CLASS,
  EASE_VALUE,
  SPEED_MS,
  SwapControlBar,
  type SwapAlign,
  type SwapEase,
  type SwapSpeed,
} from "./controls";

type Props = {
  from: string;
  to: string;
  speed: SwapSpeed;
  ease: SwapEase;
  align: SwapAlign;
  debug: boolean;
  running: boolean;
  onFromChange?: (v: string) => void;
  onToChange?: (v: string) => void;
  onSpeed: (v: SwapSpeed) => void;
  onEase: (v: SwapEase) => void;
  onAlign: (v: SwapAlign) => void;
  onDebug: (v: boolean) => void;
  onToggleRun: () => void;
  onCycle?: (showingTo: boolean) => void;
  showInputs?: boolean;
  className?: string;
  previewClassName?: string;
};

export function SwapPreview({
  from,
  to,
  speed,
  ease,
  align,
  debug,
  running,
  onFromChange,
  onToChange,
  onSpeed,
  onEase,
  onAlign,
  onDebug,
  onToggleRun,
  onCycle,
  showInputs = false,
  className = "",
  previewClassName = "text-[28px] font-medium tracking-tight text-foreground sm:text-[36px]",
}: Props) {
  const [showingTo, setShowingTo] = useState(false);
  const [tick, setTick] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [jumpPx, setJumpPx] = useState(0);

  const display = showingTo ? to : from;

  useEffect(() => {
    if (!running) return;
    const ms = Number.parseInt(SPEED_MS[speed], 10) + 280;
    const id = window.setInterval(() => {
      setShowingTo((prev) => {
        const next = !prev;
        onCycle?.(next);
        return next;
      });
      setTick((t) => t + 1);
    }, Math.max(ms, 200));
    return () => window.clearInterval(id);
  }, [running, speed, onCycle]);

  useEffect(() => {
    if (!running) {
      setShowingTo(false);
    }
  }, [running]);

  useEffect(() => {
    if (!debug || !boxRef.current) {
      setJumpPx(0);
      return;
    }
    const el = boxRef.current;
    const before = el.getBoundingClientRect();
    const raf = requestAnimationFrame(() => {
      const after = el.getBoundingClientRect();
      setJumpPx(
        Math.max(
          Math.abs(after.width - before.width),
          Math.abs(after.left - before.left),
        ),
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [display, tick, debug]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {showInputs ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">
              From
            </span>
            <input
              type="text"
              value={from}
              onChange={(e) => onFromChange?.(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[13px] text-foreground outline-none focus:border-border-strong"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">
              To
            </span>
            <input
              type="text"
              value={to}
              onChange={(e) => onToChange?.(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[13px] text-foreground outline-none focus:border-border-strong"
            />
          </label>
        </div>
      ) : null}

      <div
        ref={boxRef}
        className={`flex min-h-[4.5rem] flex-col justify-center rounded-lg px-3 py-4 ${ALIGN_CLASS[align]} ${
          debug
            ? "outline outline-1 outline-cyan-400/70 outline-offset-[-1px]"
            : ""
        }`}
        style={
          {
            "--text-swap-dur": SPEED_MS[speed],
            "--text-swap-ease": EASE_VALUE[ease],
          } as React.CSSProperties
        }
      >
        <div
          className={`${previewClassName} ${
            debug ? "outline outline-1 outline-fuchsia-500/60 outline-offset-2" : ""
          }`}
        >
          {display ? (
            <TextSwap key={`${display}-${tick}`}>{display}</TextSwap>
          ) : (
            <span className="text-subtle">∅</span>
          )}
        </div>
        {debug ? (
          <p className="mt-2 font-mono text-[10px] text-subtle">
            jump ≈ {jumpPx.toFixed(1)}px · key={display || "∅"} · tick={tick}
          </p>
        ) : null}
      </div>

      <SwapControlBar
        speed={speed}
        ease={ease}
        align={align}
        debug={debug}
        running={running}
        onSpeed={onSpeed}
        onEase={onEase}
        onAlign={onAlign}
        onDebug={onDebug}
        onToggleRun={onToggleRun}
      />
    </div>
  );
}
