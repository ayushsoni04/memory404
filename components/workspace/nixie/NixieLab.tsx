"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ControlChip } from "@/components/workspace/text-swap/controls";
import {
  DEFAULT_NIXIE_TIMING,
  NIXIE_MODES,
  type NixieMode,
  type NixieTiming,
} from "@/lib/nixie";
import { NixieCounter, type NixieCounterHandle } from "./NixieCounter";

type CountState =
  | { status: "loading" }
  | { status: "ready"; total: number }
  | { status: "error"; message: string };

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between font-mono text-[10px] text-subtle">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#ff6a1f]"
      />
    </label>
  );
}

/** Workspace lab: your link count on nixie tubes, plus how changes animate. */
export function NixieLab() {
  const [count, setCount] = useState<CountState>({ status: "loading" });
  const [value, setValue] = useState(0);
  const [mode, setMode] = useState<NixieMode>("slot");
  const [autoTubes, setAutoTubes] = useState(true);
  const [tubeCount, setTubeCount] = useState(6);
  const [leadingZeros, setLeadingZeros] = useState(true);
  const [glow, setGlow] = useState(0.7);
  const [timing, setTiming] = useState<NixieTiming>(DEFAULT_NIXIE_TIMING);
  const [running, setRunning] = useState(false);
  const handle = useRef<NixieCounterHandle | null>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const loadCount = useCallback(async () => {
    setCount({ status: "loading" });
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { totalLinks?: number; error?: string };
      if (!res.ok || typeof data.totalLinks !== "number") {
        throw new Error(data.error || "Could not load your link count.");
      }
      setCount({ status: "ready", total: data.totalLinks });
      setValue(data.totalLinks);
    } catch (error) {
      setCount({ status: "error", message: error instanceof Error ? error.message : "Could not load your link count." });
    }
  }, []);

  useEffect(() => {
    // Load once on open. The fetch resolves after mount, so this isn't a sync update.
    const id = window.setTimeout(() => void loadCount(), 0);
    return () => window.clearTimeout(id);
  }, [loadCount]);

  // Auto-run: saving and deleting links at random.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const r = Math.random();
      const delta = r < 0.55 ? 1 : r < 0.75 ? -1 : r < 0.9 ? 10 : 137;
      setValue((v) => Math.max(0, v + delta));
    }, 1800);
    return () => window.clearInterval(id);
  }, [running]);

  const tubes = useMemo(
    () => (autoTubes ? Math.max(4, String(Math.max(0, value)).length) : tubeCount),
    [autoTubes, tubeCount, value],
  );
  const bump = (delta: number) => setValue((v) => Math.max(0, v + delta));
  const live = count.status === "ready" ? count.total : null;

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-baseline justify-between gap-2 border-b border-border bg-surface px-3 py-2">
          <h2 className="font-mono text-[12px] font-medium text-foreground">Links held</h2>
          <p className="font-mono text-[10px] text-subtle" aria-live="polite">
            {count.status === "loading"
              ? "Loading your count…"
              : count.status === "error"
                ? count.message
                : value === live
                  ? `${live} links in your library`
                  : `Showing ${value} · library has ${live}`}
          </p>
        </div>
        <div className="bg-[#08080a] p-3 sm:p-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0c] shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
            <p className="pointer-events-none absolute inset-x-0 top-5 z-10 text-center font-mono text-[11px] tracking-[0.32em] text-[#cfd3dc]/80 sm:top-7 sm:text-[13px]">
              LINKS HELD
            </p>
            <NixieCounter
              value={value}
              tubes={tubes}
              mode={mode}
              leadingZeros={leadingZeros}
              glow={glow}
              timing={timing}
              onReady={(h) => (handle.current = h)}
              className="h-[240px] w-full sm:h-[320px]"
            />
            <p className="pointer-events-none absolute inset-x-0 bottom-5 z-10 text-center font-mono text-[9px] tracking-[0.24em] text-[#8a8f9a]/70 sm:bottom-7 sm:text-[11px]">
              HV SUPPLY <span className="text-[#8a8f9a]/40">·</span> CATHODE STACK{" "}
              <span className="text-[#8a8f9a]/40">·</span> GRID DISPLAY
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <ControlChip active={false} onClick={() => bump(-1)}>−1</ControlChip>
          <ControlChip active={false} onClick={() => bump(1)}>+1</ControlChip>
          <ControlChip active={false} onClick={() => bump(10)}>+10</ControlChip>
          <ControlChip active={false} onClick={() => bump(137)}>+137</ControlChip>
          <ControlChip active={false} onClick={() => setValue(Math.floor(Math.random() * 10 ** Math.min(tubes, 7)))}>
            Random
          </ControlChip>
          <ControlChip
            active={false}
            onClick={() => handle.current?.replay(Math.max(0, valueRef.current - 1))}
          >
            Replay
          </ControlChip>
          <ControlChip active={false} onClick={() => (live === null ? void loadCount() : setValue(live))}>
            Live count
          </ControlChip>
          <span className="ms-auto" />
          <ControlChip active={running} tone="accent" onClick={() => setRunning((r) => !r)}>
            {running ? "Stop" : "Run"}
          </ControlChip>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-subtle">When the number changes</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Change animation">
            {NIXIE_MODES.map((m) => (
              <ControlChip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>
                {m.label}
              </ControlChip>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">{NIXIE_MODES.find((m) => m.id === mode)?.hint}</p>
        </div>

        <div className="mt-4 grid gap-4 border-t border-border pt-3 sm:grid-cols-2">
          <Slider
            label="Glow"
            value={glow}
            min={0}
            max={3}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={setGlow}
          />
          <Slider
            label="Tube stagger"
            value={timing.staggerMs}
            min={0}
            max={200}
            step={5}
            format={(v) => `${v}ms`}
            onChange={(v) => setTiming((t) => ({ ...t, staggerMs: v }))}
          />
          <Slider
            label="Cathode step"
            value={timing.stepMs}
            min={15}
            max={120}
            step={1}
            format={(v) => `${v}ms`}
            onChange={(v) => setTiming((t) => ({ ...t, stepMs: v }))}
          />
          <Slider
            label="Slot shuffles"
            value={timing.slotSteps}
            min={2}
            max={20}
            step={1}
            format={(v) => String(v)}
            onChange={(v) => setTiming((t) => ({ ...t, slotSteps: v }))}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <ControlChip active={autoTubes} onClick={() => setAutoTubes((a) => !a)}>
            Auto tubes
          </ControlChip>
          {!autoTubes
            ? [4, 5, 6, 7, 8].map((n) => (
                <ControlChip key={n} active={tubeCount === n} onClick={() => setTubeCount(n)}>
                  {n}
                </ControlChip>
              ))
            : null}
          <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
          <ControlChip active={leadingZeros} onClick={() => setLeadingZeros((z) => !z)}>
            Leading zeros
          </ControlChip>
          <ControlChip active={false} onClick={() => { setGlow(0.7); setTiming(DEFAULT_NIXIE_TIMING); }}>
            Reset
          </ControlChip>
        </div>
      </section>
    </div>
  );
}
