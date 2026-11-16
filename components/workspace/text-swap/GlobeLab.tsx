"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ControlChip } from "./controls";
import {
  GLOBE_PEEK_OPACITY,
  GLOBE_PEEK_REACH_EM,
  GLOBE_ROLL_LIMIT,
  GlobeSwap,
  type GlobeMode,
} from "./GlobeSwap";

/** Same order as the vault group row: All first, then the groups. */
const GLOBE_ITEMS = [
  "All Links",
  "design",
  "learn",
  "website",
  "design system",
  "three js",
  "dream project",
  "interface anatomy books",
  "companies",
  "inspos",
  "UI pallete creation",
  "read learn",
  "workflow case study",
  "read book",
  "animations",
];

const GLOBE_SPEED = { fast: 380, default: 560, slow: 900 } as const;
type GlobeSpeed = keyof typeof GLOBE_SPEED;

export function GlobeLab() {
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState<GlobeSpeed>("default");
  const [peek, setPeek] = useState(true);
  const [peekOpacity, setPeekOpacity] = useState(GLOBE_PEEK_OPACITY);
  const [peekReach, setPeekReach] = useState(GLOBE_PEEK_REACH_EM);
  const [align, setAlign] = useState<"left" | "center">("left");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<{ mode: GlobeMode; distance: number }>({
    mode: "rest",
    distance: 0,
  });
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const go = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(GLOBE_ITEMS.length - 1, next)));
  }, []);

  // Auto-run alternates short rolls and long blurred jumps.
  useEffect(() => {
    if (!running) return;
    let step = 0;
    const id = window.setInterval(() => {
      const cur = indexRef.current;
      const last = GLOBE_ITEMS.length - 1;
      const pattern = [1, 2, 3, 9, -1, -3, -10];
      let next = cur + pattern[step % pattern.length];
      if (next < 0 || next > last) next = next < 0 ? Math.min(last, cur + 6) : Math.max(0, cur - 6);
      step++;
      go(next);
    }, GLOBE_SPEED[speed] + 700);
    return () => window.clearInterval(id);
  }, [running, speed, go]);

  return (
    <section className="rounded-xl border border-border bg-surface p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-[12px] font-medium text-foreground">Globe</h2>
        <p className="font-mono text-[10px] text-subtle">
          Up to {GLOBE_ROLL_LIMIT} steps rolls through each name · further is a blur · same time
          for every jump
        </p>
      </div>

      <div className="flex min-h-[9rem] items-center rounded-lg px-3 py-6">
        <GlobeSwap
          items={GLOBE_ITEMS}
          index={index}
          durationMs={GLOBE_SPEED[speed]}
          peek={peek}
          peekOpacity={peekOpacity}
          peekReach={peekReach}
          align={align}
          onModeChange={(mode, distance) => setStatus({ mode, distance })}
          className="w-full font-departure text-[28px] font-medium uppercase leading-[1.25] tracking-wide text-foreground sm:text-[36px]"
        />
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <PeekSlider
          label="Neighbour opacity"
          value={peekOpacity}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          disabled={!peek}
          onChange={setPeekOpacity}
          onReset={() => setPeekOpacity(GLOBE_PEEK_OPACITY)}
        />
        <PeekSlider
          label="Neighbour reach"
          value={peekReach}
          min={0.3}
          max={3}
          step={0.05}
          format={(v) => `${v.toFixed(2)}em`}
          disabled={!peek}
          onChange={setPeekReach}
          onReset={() => setPeekReach(GLOBE_PEEK_REACH_EM)}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Jump to">
        {GLOBE_ITEMS.map((label, i) => (
          <ControlChip key={label} active={i === index} onClick={() => go(i)}>
            {label}
            {i !== index ? (
              <span className="ms-1 text-subtle">{i > index ? "+" : "−"}{Math.abs(i - index)}</span>
            ) : null}
          </ControlChip>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <ControlChip active={false} onClick={() => go(index - 1)}>
            ↑ prev
          </ControlChip>
          <ControlChip active={false} onClick={() => go(index + 1)}>
            ↓ next
          </ControlChip>
          <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
          {(["fast", "default", "slow"] as const).map((id) => (
            <ControlChip key={id} active={speed === id} onClick={() => setSpeed(id)}>
              {id} {GLOBE_SPEED[id]}ms
            </ControlChip>
          ))}
          <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
          <ControlChip active={peek} onClick={() => setPeek((v) => !v)}>
            Peek
          </ControlChip>
          {(["left", "center"] as const).map((id) => (
            <ControlChip key={id} active={align === id} onClick={() => setAlign(id)}>
              {id === "left" ? "L" : "C"}
            </ControlChip>
          ))}
          <span className="ms-1 font-mono text-[10px] text-subtle" aria-live="polite">
            {status.mode === "rest"
              ? `rest · last jump ${status.distance}`
              : `${status.mode} · ${status.distance} step${status.distance === 1 ? "" : "s"}`}
          </span>
        </div>
        <ControlChip active={running} tone="accent" onClick={() => setRunning((v) => !v)}>
          {running ? "Stop" : "Run"}
        </ControlChip>
      </div>
    </section>
  );
}

function PeekSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  disabled,
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  disabled: boolean;
  onChange: (value: number) => void;
  onReset: () => void;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${disabled ? "opacity-50" : ""}`}>
      <span className="flex items-baseline justify-between font-mono text-[10px] text-subtle">
        <span>{label}</span>
        <span className="flex items-baseline gap-2">
          <span className="tabular-nums text-foreground">{format(value)}</span>
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="underline-offset-2 hover:text-foreground hover:underline disabled:pointer-events-none"
          >
            reset
          </button>
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent,currentColor)]"
      />
    </label>
  );
}
