"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LinkOdometer } from "@/components/vault/LinkOdometer";
import {
  Glyph,
  SplitTiles,
  STRIP,
  Strip,
  Watermark,
  cellIndexes,
} from "@/components/vault/HeroCounters";
import { ControlChip } from "../text-swap/controls";
import { GlobeSwap } from "../text-swap/GlobeSwap";
import "./counter-lab.css";

/** Same order as the vault group row: All first, then the groups. */
export const GROUPS: { name: string; count: number }[] = [
  { name: "All Links", count: 293 },
  { name: "design", count: 41 },
  { name: "learn", count: 24 },
  { name: "website", count: 37 },
  { name: "design system", count: 18 },
  { name: "three js", count: 9 },
  { name: "dream project", count: 2 },
  { name: "companies", count: 31 },
  { name: "inspos", count: 56 },
  { name: "animations", count: 15 },
];

export const NAMES = GROUPS.map((group) => group.name);
/** Matches the live heading so the lab moves at the real speed. */
export const ROLL_MS = 560;
const ORANGE = "#ee6a3a";

export const statement = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}.`;

type CounterProps = { count: number };



/* ── 2 · Carved into the backdrop ─────────────────────────────────────── */

/** No object at all: three slots cut into the page, the digits pressed in at the bottom of each. */
function Carved({ count }: CounterProps) {
  const cells = cellIndexes(count);
  const H = 30;
  const BOX = 50;
  const peek = (BOX - H) / 2;
  return (
    <span className="counter-carved flex gap-[7px] font-mono text-[22px] font-medium leading-none">
      {cells.map((index, place) => (
        <span
          key={cells.length - place}
          className="counter-carved-slot relative block w-[30px] overflow-hidden rounded-[6px]"
          style={{ height: BOX }}
        >
          <Strip index={index} h={H} peek={peek} />
        </span>
      ))}
    </span>
  );
}

/* ── 4 · Lit dial ──────────────────────────────────────────────────────── */

/** Every digit is always printed; a small lamp slides to the ones that count. */
function LitDial({ count }: CounterProps) {
  const cells = cellIndexes(count);
  const H = 15;
  return (
    <span className="flex gap-3 font-departure text-[12px] leading-none">
      {cells.map((index, place) => {
        const off = index === 0;
        const digit = index - 1;
        return (
          <span key={cells.length - place} className="relative flex w-[22px] flex-col items-center">
            {/* The lamp behind the lit digit. */}
            <span
              className="absolute inset-x-0 top-0 rounded-[4px] transition-[transform,opacity] ease-[var(--ease-in-out-cubic)] motion-reduce:transition-none"
              style={{
                height: H,
                transform: `translateY(${(off ? 0 : digit) * H}px)`,
                opacity: off ? 0 : 1,
                transitionDuration: `${ROLL_MS}ms`,
                background: ORANGE,
                boxShadow: `0 0 14px ${ORANGE}88`,
              }}
            />
            {Array.from({ length: 10 }, (_, d) => (
              <span
                key={d}
                className="relative flex w-full items-center justify-center transition-colors duration-300"
                style={{
                  height: H,
                  color: !off && d === digit ? "#04050a" : "rgba(255,255,255,0.18)",
                }}
              >
                {d}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

/* ── 5 · Split-flap ────────────────────────────────────────────────────── */

const FLAP_MS = 90;

/** Steps one glyph at a time toward the target, so a big change rattles through like a departures board. */
function useStepper(target: number) {
  const [shown, setShown] = useState(target);
  const [prev, setPrev] = useState(target);
  const [tick, setTick] = useState(0);
  const shownRef = useRef(target);

  useEffect(() => {
    if (shownRef.current === target) return;
    const id = window.setInterval(() => {
      const cur = shownRef.current;
      if (cur === target) {
        window.clearInterval(id);
        return;
      }
      const next = (cur + 1) % STRIP.length;
      shownRef.current = next;
      setPrev(cur);
      setShown(next);
      setTick((t) => t + 1);
    }, FLAP_MS);
    return () => window.clearInterval(id);
  }, [target]);

  return { shown, prev, tick };
}

function FlapHalf({ glyph, half }: { glyph: string; half: "top" | "bottom" }) {
  return (
    <span
      className={`counter-flap-half absolute inset-x-0 overflow-hidden ${half === "top" ? "top-0 rounded-t-[6px]" : "bottom-0 rounded-b-[6px]"}`}
      data-half={half}
    >
      <span className="absolute inset-x-0 flex items-center justify-center" style={{ height: 44, top: half === "top" ? 0 : -22 }}>
        <Glyph glyph={glyph} />
      </span>
    </span>
  );
}

function FlapCell({ index }: { index: number }) {
  const { shown, prev, tick } = useStepper(index);
  const cur = STRIP[shown];
  const old = STRIP[prev];
  return (
    <span className="relative block h-[44px] w-[30px] [perspective:140px]">
      {/* Static: new top, old bottom. */}
      <FlapHalf glyph={cur} half="top" />
      <FlapHalf glyph={tick ? old : cur} half="bottom" />
      {tick ? (
        <span key={tick} className="absolute inset-0">
          {/* Old top falls away, new bottom swings into place. */}
          <span className="counter-flap-fall absolute inset-0" style={{ animationDuration: `${FLAP_MS}ms` }}>
            <FlapHalf glyph={old} half="top" />
          </span>
          <span className="counter-flap-land absolute inset-0" style={{ animationDuration: `${FLAP_MS}ms` }}>
            <FlapHalf glyph={cur} half="bottom" />
          </span>
        </span>
      ) : null}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px -translate-y-1/2 bg-black/80" />
    </span>
  );
}

function SplitFlap({ count }: CounterProps) {
  const cells = cellIndexes(count);
  return (
    <span className="flex gap-[4px] font-mono text-[20px] font-medium leading-none text-[#f2efe6]">
      {cells.map((index, place) => (
        <FlapCell key={cells.length - place} index={index} />
      ))}
    </span>
  );
}

/* ── 6 · 3D drums ──────────────────────────────────────────────────────── */

/** Real cylinders: eleven faces round a wheel, turned on X. You see the curve, not a fake gradient. */
function Drums({ count }: CounterProps) {
  const cells = cellIndexes(count);
  const FACE = 26;
  const step = 360 / STRIP.length;
  const radius = FACE / 2 / Math.tan(Math.PI / STRIP.length);
  return (
    <span className="flex gap-[3px] rounded-[12px] bg-[#0a0a0a] p-[4px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.06)]">
      {cells.map((index, place) => (
        <span
          key={cells.length - place}
          className="relative block h-[48px] w-[26px] overflow-hidden rounded-[7px] bg-black [perspective:300px]"
        >
          <span
            className="absolute inset-x-0 top-1/2 transition-transform ease-[var(--ease-in-out-cubic)] [transform-style:preserve-3d] motion-reduce:transition-none"
            style={{
              height: FACE,
              marginTop: -FACE / 2,
              transform: `translateZ(${-radius}px) rotateX(${index * step}deg)`,
              transitionDuration: `${ROLL_MS + 120}ms`,
              transitionDelay: `${(cells.length - 1 - place) * 70}ms`,
            }}
          >
            {STRIP.map((glyph, i) => (
              <span
                key={i}
                className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(to_bottom,#e9e5da,#d6d1c4)] font-mono text-[18px] font-semibold leading-none text-[#141414] [backface-visibility:hidden]"
                style={{ transform: `rotateX(${-i * step}deg) translateZ(${radius}px)` }}
              >
                <Glyph glyph={glyph} />
              </span>
            ))}
          </span>
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.85),rgba(0,0,0,0.1)_34%,transparent_50%,rgba(0,0,0,0.1)_66%,rgba(0,0,0,0.9))]" />
        </span>
      ))}
    </span>
  );
}

/* ── Lab ───────────────────────────────────────────────────────────────── */

type VariantDef = {
  id: string;
  title: string;
  note: string;
  render: (count: number, title: React.ReactNode) => React.ReactNode;
};

const HeroStack = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex flex-col items-center gap-[22px]">
    {title}
    {children}
  </div>
);

const VARIANTS: VariantDef[] = [
  {
    id: "0",
    title: "Current (live)",
    note: "The one-piece odometer in the library today, for comparison.",
    render: (count, title) => (
      <HeroStack title={title}>
        <LinkOdometer count={count} />
      </HeroStack>
    ),
  },
  {
    id: "1",
    title: "Split tiles",
    note: "Each place is its own tile with its own drum. They land one after another, units first, so each digit feels separate.",
    render: (count, title) => (
      <HeroStack title={title}>
        <SplitTiles count={count} />
      </HeroStack>
    ),
  },
  {
    id: "2",
    title: "Carved",
    note: "No object: three slots cut into the backdrop and the digits debossed inside. The counter is the page.",
    render: (count, title) => (
      <HeroStack title={title}>
        <Carved count={count} />
      </HeroStack>
    ),
  },
  {
    id: "3",
    title: "Watermark",
    note: "The count is the backdrop itself: huge outlined reels behind the title. A small mono readout keeps it legible.",
    render: (count, title) => <Watermark count={count}>{title}</Watermark>,
  },
  {
    id: "4",
    title: "Lit dial",
    note: "Every digit is always printed; an orange lamp slides to the ones that count. Reads as an instrument, not a box.",
    render: (count, title) => (
      <HeroStack title={title}>
        <LitDial count={count} />
      </HeroStack>
    ),
  },
  {
    id: "5",
    title: "Split-flap",
    note: "Departures board: each place flips one card at a time to its digit, so a big jump rattles through.",
    render: (count, title) => (
      <HeroStack title={title}>
        <SplitFlap count={count} />
      </HeroStack>
    ),
  },
  {
    id: "6",
    title: "3D drums",
    note: "Real cylinders in a recessed housing, paper-white faces turned on X. Each wheel lands a beat after its neighbour.",
    render: (count, title) => (
      <HeroStack title={title}>
        <Drums count={count} />
      </HeroStack>
    ),
  },
];

export function CounterLab() {
  const [index, setIndex] = useState(0);
  const [bump, setBump] = useState(0);
  const [running, setRunning] = useState(false);
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const go = useCallback((next: number) => {
    setBump(0);
    setIndex(Math.max(0, Math.min(GROUPS.length - 1, next)));
  }, []);

  useEffect(() => {
    if (!running) return;
    let step = 0;
    const id = window.setInterval(() => {
      const pattern = [1, 1, 3, -2, 4, -5, 2];
      const last = GROUPS.length - 1;
      let next = indexRef.current + pattern[step % pattern.length];
      if (next < 0 || next > last) next = 0;
      step++;
      go(next);
    }, ROLL_MS + 1100);
    return () => window.clearInterval(id);
  }, [running, go]);

  const count = Math.max(0, GROUPS[index].count + bump);
  const title = (
    <h3 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.035em] text-white">
      <GlobeSwap
        items={NAMES}
        index={index}
        durationMs={ROLL_MS}
        display={statement}
        peekOpacity={0.39}
        peekReach={0.75}
      />
    </h3>
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="sticky top-2 z-10 rounded-xl border border-border bg-surface p-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Open group">
          {GROUPS.map((group, i) => (
            <ControlChip key={group.name} active={i === index} onClick={() => go(i)}>
              {group.name} · {group.count}
            </ControlChip>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-border pt-2.5">
          <div className="flex items-center gap-1.5">
            <ControlChip active={false} onClick={() => setBump((b) => b - 1)}>
              −1 link
            </ControlChip>
            <ControlChip active={false} onClick={() => setBump((b) => b + 1)}>
              +1 link
            </ControlChip>
            <ControlChip active={false} onClick={() => setBump(1000 - GROUPS[index].count)}>
              1000
            </ControlChip>
            <span className="ms-1 font-mono text-[10px] text-subtle">
              Showing {count}. Every option follows the same group.
            </span>
          </div>
          <ControlChip active={running} tone="accent" onClick={() => setRunning((v) => !v)}>
            {running ? "Stop" : "Run"}
          </ControlChip>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {VARIANTS.map(({ id, title: name, note, render }) => (
          <section
            key={id}
            data-counter-variant={id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:p-4"
          >
            <div className="flex flex-col gap-1">
              <h2 className="font-mono text-[12px] font-medium text-foreground">
                {id} · {name}
              </h2>
              <p className="text-[12px] leading-snug text-muted">{note}</p>
            </div>
            {/* The page's own backdrop, so each option is judged where it lives. */}
            <div className="counter-stage flex min-h-[15rem] items-center justify-center overflow-hidden rounded-lg border border-white/10 px-6 py-8">
              {render(count, title)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
