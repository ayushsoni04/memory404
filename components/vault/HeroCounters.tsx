"use client";

import "./hero-counters.css";

/** Matches the heading globe so a group switch moves as one. */
const ROLL_MS = 560;

/** Strip order per place: a dash for unused leading places, then 0–9. */
export const STRIP = ["—", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** Same rule as LinkOdometer: three places minimum, dash for unused leading ones. */
export function cellIndexes(count: number): number[] {
  const safe = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  const digits = String(safe);
  const cells = Math.max(3, digits.length);
  return [...digits.padStart(cells, " ")].map((ch) => (ch === " " ? 0 : Number(ch) + 1));
}

export function Glyph({ glyph, dashWidth = "55%" }: { glyph: string; dashWidth?: string }) {
  return glyph === "—" ? (
    <span className="block h-px bg-current opacity-40" style={{ width: dashWidth }} />
  ) : (
    <>{glyph}</>
  );
}

/** A vertical strip of — 0…9 parked on `index`. `peek` offsets it so the current glyph sits mid-window. */
export function Strip({
  index,
  h,
  peek,
  delayMs = 0,
  durationMs = ROLL_MS,
  dashWidth,
}: {
  index: number;
  h: number;
  peek: number;
  delayMs?: number;
  durationMs?: number;
  dashWidth?: string;
}) {
  return (
    <span
      className="absolute inset-x-0 top-0 flex flex-col items-center transition-transform ease-[var(--ease-in-out-cubic)] motion-reduce:transition-none"
      style={{
        transform: `translateY(${peek - index * h}px)`,
        transitionDuration: `${durationMs}ms`,
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {STRIP.map((glyph, i) => (
        <span key={i} className="flex w-full items-center justify-center" style={{ height: h }}>
          <Glyph glyph={glyph} dashWidth={dashWidth} />
        </span>
      ))}
    </span>
  );
}

type CounterProps = { count: number };

/* ── 1 · Split tiles ───────────────────────────────────────────────────── */

/** Every place is its own little drum, and they land one after another, units first. */
export function SplitTiles({ count }: CounterProps) {
  const cells = cellIndexes(count);
  const H = 24;
  const BOX = 44;
  const peek = (BOX - H) / 2;
  return (
    <span className="flex gap-[5px] font-mono text-[18px] font-medium leading-none text-white">
      {cells.map((index, place) => {
        const fromRight = cells.length - 1 - place;
        return (
          <span
            key={cells.length - place}
            className="relative block w-[30px] overflow-hidden rounded-[8px] bg-[linear-gradient(to_bottom,#262626,#0d0d0d_55%,#161616)] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_0_1px_rgba(255,255,255,0.03),0_6px_16px_rgba(0,0,0,0.4)]"
            style={{ height: BOX }}
          >
            <span className="absolute inset-0 opacity-55 blur-[1.2px]">
              <Strip index={index} h={H} peek={peek} delayMs={fromRight * 90} />
            </span>
            <span
              className="absolute inset-0"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent 22%, #000 34%, #000 66%, transparent 78%)",
              }}
            >
              <Strip index={index} h={H} peek={peek} delayMs={fromRight * 90} />
            </span>
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent_32%,transparent_68%,rgba(0,0,0,0.6))]" />
            {/* The axle line every real tile has. */}
            <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/40" />
          </span>
        );
      })}
    </span>
  );
}

/* ── 3 · Watermark ─────────────────────────────────────────────────────── */

/** The count is the backdrop: huge outlined reels behind the title, barely there. */
export function Watermark({ count, children }: CounterProps & { children: React.ReactNode }) {
  const cells = cellIndexes(count);
  const H = 150;
  const BOX = 170;
  const peek = (BOX - H) / 2;
  return (
    <div className="relative flex w-full items-center justify-center" style={{ height: BOX }}>
      <span
        aria-hidden
        className="counter-watermark absolute inset-0 flex justify-center font-mono text-[150px] font-semibold leading-none"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 4%, #000 30%, #000 70%, transparent 96%)",
        }}
      >
        {cells.map((index, place) => (
          <span key={cells.length - place} className="relative block h-full w-[96px] overflow-hidden">
            <Strip
              index={index}
              h={H}
              peek={peek}
              delayMs={(cells.length - 1 - place) * 60}
              durationMs={ROLL_MS + 260}
              dashWidth="40%"
            />
          </span>
        ))}
      </span>
      <div className="relative flex flex-col items-center gap-2">
        {children}
        <span className="font-departure text-[10px] uppercase tracking-[0.18em] text-white/45">
          {count} links
        </span>
      </div>
    </div>
  );
}

