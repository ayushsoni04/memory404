"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LinkOdometer } from "@/components/vault/LinkOdometer";
import { ControlChip } from "../text-swap/controls";
import { GlobeSwap } from "../text-swap/GlobeSwap";

/** Same order as the vault group row: All first, then the groups. */
const GROUPS: { name: string; count: number }[] = [
  { name: "All Links", count: 293 },
  { name: "design", count: 41 },
  { name: "learn", count: 24 },
  { name: "website", count: 37 },
  { name: "design system", count: 18 },
  { name: "three js", count: 9 },
  { name: "dream project", count: 2 },
  { name: "interface anatomy books", count: 12 },
  { name: "companies", count: 31 },
  { name: "inspos", count: 56 },
  { name: "UI pallete creation", count: 7 },
  { name: "read learn", count: 22 },
  { name: "workflow case study", count: 15 },
  { name: "read book", count: 4 },
  { name: "animations", count: 15 },
];

const NAMES = GROUPS.map((group) => group.name);
/** "design system" -> "Design system." for the statement variant. */
const statement = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}.`;
/** Matches the live heading so the lab moves at the real speed. */
const ROLL_MS = 560;

const INK = "#04050a";
const ORANGE = "#ee6a3a";
const WIDE = 'var(--font-wide), "Archivo", "Arial Black", ui-sans-serif, sans-serif';
/** The header's own backdrop, so each option is judged where it will live. */
const STAGE_BACKDROP = `radial-gradient(110% 170% at 58% -50%, rgba(140,180,240,0.42) 0%, rgba(70,110,215,0.24) 34%, rgba(31,58,156,0.1) 58%, transparent 78%), ${INK}`;

const pad2 = (value: number) => String(value).padStart(2, "0");

type VariantProps = { index: number };

/** 1 — No box at all: the poster's big, tight statement type. */
function StatementHeading({ index }: VariantProps) {
  return (
    <div className="flex w-full items-center justify-between gap-6">
      <h3
        className="min-w-0 flex-1 text-[30px] font-bold leading-[1.08] text-white sm:text-[38px]"
        style={{ letterSpacing: "-0.058em" }}
      >
        <GlobeSwap
          items={NAMES}
          index={index}
          durationMs={ROLL_MS}
          display={statement}
          peekOpacity={0.22}
          peekReach={0.8}
        />
      </h3>
      <LinkOdometer count={GROUPS[index].count} />
    </div>
  );
}

/** 2 — Wide caps on an open drum, with a mono position number in front. */
function WideDrumHeading({ index }: VariantProps) {
  return (
    <div className="flex w-full items-center justify-between gap-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          className="font-departure flex shrink-0 flex-col gap-1 text-[11px] leading-none"
          aria-hidden
        >
          <span style={{ color: ORANGE }}>{pad2(index + 1)}</span>
          <span className="text-white/40">/{pad2(GROUPS.length)}</span>
        </span>
        <span className="h-9 w-px shrink-0 bg-white/25" aria-hidden />
        <h3
          className="min-w-0 flex-1 text-[22px] uppercase leading-[1.3] text-white sm:text-[26px]"
          style={{
            fontFamily: WIDE,
            fontStretch: "125%",
            fontWeight: 800,
            letterSpacing: "0.03em",
          }}
        >
          <GlobeSwap
            items={NAMES}
            index={index}
            durationMs={ROLL_MS}
            peekOpacity={0.28}
            peekReach={1.2}
          />
        </h3>
      </div>
      <LinkOdometer count={GROUPS[index].count} />
    </div>
  );
}

/** 3 — A tuner: bracketed mono name over a dial that marks where you are. */
function TunerHeading({ index }: VariantProps) {
  return (
    <div className="flex w-full items-center justify-between gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <span className="font-departure text-[10px] uppercase leading-none tracking-[0.14em] text-white/45">
          Now viewing
        </span>
        <h3 className="font-departure flex min-w-0 items-center gap-2 text-[22px] uppercase leading-[1.2] text-white">
          <span aria-hidden style={{ color: ORANGE }}>
            [
          </span>
          <GlobeSwap
            items={NAMES}
            index={index}
            durationMs={ROLL_MS}
            peek={false}
            className="min-w-0"
          />
          <span aria-hidden style={{ color: ORANGE }}>
            ]
          </span>
        </h3>
        <span className="flex h-4 items-end gap-[5px]" aria-hidden>
          {GROUPS.map((group, i) => (
            <span
              key={group.name}
              className="w-[2px] rounded-full transition-[height,background-color] duration-300 ease-[var(--ease-out)]"
              style={{
                height: i === index ? 16 : 7,
                backgroundColor: i === index ? ORANGE : "rgba(255,255,255,0.28)",
              }}
            />
          ))}
        </span>
      </div>
      <LinkOdometer count={GROUPS[index].count} />
    </div>
  );
}

/** 4 — A quiet badge: one hairline, nothing clipped, the count built in. */
function QuietBadgeHeading({ index }: VariantProps) {
  return (
    <div className="flex w-full items-center">
      <div
        className="inline-flex h-10 max-w-full items-center rounded-full border border-white/35 ps-3 pe-1.5"
        style={{ backgroundColor: "rgba(4,5,10,0.55)" }}
      >
        <span className="art-toggle-orb" aria-hidden />
        <h3
          className="ms-2.5 min-w-0 text-[12px] uppercase leading-[1.3] text-white"
          style={{
            fontFamily: WIDE,
            fontStretch: "125%",
            fontWeight: 800,
            letterSpacing: "0.05em",
          }}
        >
          <GlobeSwap items={NAMES} index={index} durationMs={ROLL_MS} peek={false} />
        </h3>
        <span
          className="font-departure ms-3 inline-flex h-7 shrink-0 items-center rounded-full bg-white px-2.5 text-[11px] leading-none"
          style={{ color: INK }}
        >
          {GROUPS[index].count}
        </span>
      </div>
    </div>
  );
}

const VARIANTS: {
  id: string;
  title: string;
  note: string;
  Heading: (props: VariantProps) => React.ReactNode;
}[] = [
  {
    id: "1",
    title: "Statement (live in the library)",
    note: "No box. Big tight type like the closing line under the feed; neighbours fade above and below.",
    Heading: StatementHeading,
  },
  {
    id: "2",
    title: "Wide drum",
    note: "Wide caps on an open drum with a position number. Nothing clips the names rolling past.",
    Heading: WideDrumHeading,
  },
  {
    id: "3",
    title: "Tuner",
    note: "Bracketed mono name over a dial. The tall orange tick is where this group sits in the row.",
    Heading: TunerHeading,
  },
  {
    id: "4",
    title: "Quiet badge",
    note: "One hairline pill that hugs the name, no peeking neighbours, with the link count built in.",
    Heading: QuietBadgeHeading,
  },
];

export function GroupHeadingLab() {
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const go = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(GROUPS.length - 1, next)));
  }, []);

  // Auto-run mixes one-step moves with long jumps, like real browsing.
  useEffect(() => {
    if (!running) return;
    let step = 0;
    const id = window.setInterval(() => {
      const cur = indexRef.current;
      const last = GROUPS.length - 1;
      const pattern = [1, 1, 2, 7, -1, -3, -6];
      let next = cur + pattern[step % pattern.length];
      if (next < 0 || next > last) next = next < 0 ? Math.min(last, cur + 5) : Math.max(0, cur - 5);
      step++;
      go(next);
    }, ROLL_MS + 900);
    return () => window.clearInterval(id);
  }, [running, go]);

  return (
    <div className="flex flex-col gap-4">
      <section className="sticky top-2 z-10 rounded-xl border border-border bg-surface p-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Open group">
          {GROUPS.map((group, i) => (
            <ControlChip key={group.name} active={i === index} onClick={() => go(i)}>
              {group.name}
            </ControlChip>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-border pt-2.5">
          <div className="flex items-center gap-1.5">
            <ControlChip active={false} onClick={() => go(index - 1)}>
              ← prev
            </ControlChip>
            <ControlChip active={false} onClick={() => go(index + 1)}>
              next →
            </ControlChip>
            <span className="ms-1 font-mono text-[10px] text-subtle">
              Every option below follows the same group.
            </span>
          </div>
          <ControlChip active={running} tone="accent" onClick={() => setRunning((v) => !v)}>
            {running ? "Stop" : "Run"}
          </ControlChip>
        </div>
      </section>

      {/* One per row: each stage is as wide as the real library header. */}
      <div className="grid gap-4">
        {VARIANTS.map(({ id, title, note, Heading }) => (
          <section
            key={id}
            data-heading-variant={id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:p-4"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="font-mono text-[12px] font-medium text-foreground">
                {id} · {title}
              </h2>
              <p className="text-[12px] leading-snug text-muted">{note}</p>
            </div>
            <div
              className="flex min-h-[8.5rem] items-center overflow-hidden rounded-lg border border-white/10 px-6 py-7"
              style={{ background: STAGE_BACKDROP }}
            >
              <Heading index={index} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
