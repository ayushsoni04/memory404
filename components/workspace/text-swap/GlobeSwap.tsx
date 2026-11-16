"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/** Up to this many steps, every name in between rolls past and is readable. */
export const GLOBE_ROLL_LIMIT = 3;
/** Longer jumps roll this many steps at most, past a sample of the names in between. */
const BLUR_STEPS_MAX = 6;
/** Angle between neighbouring names on the drum. */
const STEP_DEG = 24;
/** Opacity of the names right above and below the current one (0–1). */
export const GLOBE_PEEK_OPACITY = 0.45;
/** How far the neighbouring names reach past the line, in em. */
export const GLOBE_PEEK_REACH_EM = 1.15;

type Slot = { key: string; label: string; pos: number };

export type GlobeMode = "rest" | "roll" | "blur";

type Props = {
  items: string[];
  index: number;
  /** Every change takes this long, whatever the distance. */
  durationMs: number;
  /** Show the neighbouring names curving away above and below. */
  peek?: boolean;
  /** Opacity of the nearest neighbours, 0–1. Names further out fade on the same slope. */
  peekOpacity?: number;
  /** How far above and below the line the neighbours show, in em. */
  peekReach?: number;
  align?: "left" | "center" | "right";
  /**
   * Changes how a name is drawn (say, "design" -> "Design."). Screen readers
   * still get the plain name.
   */
  display?: (label: string) => string;
  className?: string;
  onModeChange?: (mode: GlobeMode, distance: number) => void;
};

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

function restSlots(items: string[], index: number): Slot[] {
  const out: Slot[] = [];
  for (let i = Math.max(0, index - 3); i <= Math.min(items.length - 1, index + 3); i++) {
    out.push({ key: `r${i}`, label: items[i], pos: i });
  }
  return out;
}

/**
 * Builds the strip of names the drum spins through, plus where the spin starts
 * and ends. Short jumps use the real names; long jumps use a short strip whose
 * middle is a sample of the skipped names, which only shows up as blur.
 */
function buildJourney(items: string[], from: number, to: number) {
  const distance = Math.abs(to - from);
  const dir = Math.sign(to - from) || 1;
  if (distance <= GLOBE_ROLL_LIMIT) {
    const lo = Math.max(0, Math.min(from, to) - 3);
    const hi = Math.min(items.length - 1, Math.max(from, to) + 3);
    const slots: Slot[] = [];
    for (let i = lo; i <= hi; i++) slots.push({ key: `r${i}`, label: items[i], pos: i });
    return { slots, start: from, end: to, mode: "roll" as const, distance };
  }

  const steps = Math.min(distance, BLUR_STEPS_MAX);
  const slots: Slot[] = [];
  // Real names just before the start, so the top of the drum looks right.
  for (let k = 1; k <= 3; k++) {
    const i = from - dir * k;
    if (i >= 0 && i < items.length) slots.push({ key: `b${k}`, label: items[i], pos: -k });
  }
  slots.push({ key: "from", label: items[from], pos: 0 });
  for (let s = 1; s < steps; s++) {
    // The first and last names are the real neighbours, so the faded names
    // above and below don't swap at the start or end of the spin.
    const i =
      s === 1
        ? from + dir
        : s === steps - 1
          ? to - dir
          : from + dir * Math.round((s / steps) * distance);
    slots.push({ key: `m${s}`, label: items[i], pos: s });
  }
  slots.push({ key: "to", label: items[to], pos: steps });
  // Real names just after the end.
  for (let k = 1; k <= 3; k++) {
    const i = to + dir * k;
    if (i >= 0 && i < items.length) slots.push({ key: `a${k}`, label: items[i], pos: steps + k });
  }
  // Going up the list flips the strip so higher names still sit above.
  if (dir < 0) for (const s of slots) s.pos = -s.pos;
  return { slots, start: 0, end: dir < 0 ? -steps : steps, mode: "blur" as const, distance };
}

/**
 * Text on a drum. Changing `index` spins it so the names in between roll past:
 * readable for short jumps, a motion blur for long ones. Same duration either way.
 */
export function GlobeSwap({
  items,
  index,
  durationMs,
  peek = true,
  peekOpacity = GLOBE_PEEK_OPACITY,
  peekReach = GLOBE_PEEK_REACH_EM,
  align = "left",
  display,
  className = "",
  onModeChange,
}: Props) {
  const shown = (label: string) => (display ? display(label) : label) || "∅";
  const rawId = useId();
  const filterId = `globe-blur-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const blurRef = useRef<SVGFEGaussianBlurElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLSpanElement>());

  const [slots, setSlots] = useState<Slot[]>(() => restSlots(items, index));
  const rotRef = useRef(index);
  const shownIndexRef = useRef(index);
  const rafRef = useRef(0);
  const lineRef = useRef(40);
  const onModeRef = useRef(onModeChange);
  useEffect(() => {
    onModeRef.current = onModeChange;
  });

  const radius = () => lineRef.current / 2 / Math.tan(((STEP_DEG / 2) * Math.PI) / 180);

  /** Places every name for the current drum rotation. */
  const paint = (rot: number, current: Slot[]) => {
    const r = radius();
    for (const s of current) {
      const el = itemRefs.current.get(s.key);
      if (!el) continue;
      const offset = s.pos - rot;
      const deg = -offset * STEP_DEG;
      const away = Math.abs(offset);
      const visible = away < 3.5 && (peek || away < 1.2);
      // Pull back by the radius so the front name sits at true size.
      el.style.transform = `translateZ(${-r}px) rotateX(${deg}deg) translateZ(${r}px)`;
      const falloff = peek ? 1 - Math.min(1, Math.max(0, peekOpacity)) : 0.9;
      el.style.opacity = visible ? String(Math.max(0, 1 - away * falloff)) : "0";
    }
  };

  const setBlur = (px: number) => {
    blurRef.current?.setAttribute("stdDeviation", `0 ${px.toFixed(2)}`);
  };

  // Line height drives the drum radius.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      lineRef.current = el.getBoundingClientRect().height || 40;
      paint(rotRef.current, slots);
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paint reads refs
  }, [slots, peek, peekOpacity, peekReach]);

  useEffect(() => {
    const from = shownIndexRef.current;
    if (from === index) return;
    cancelAnimationFrame(rafRef.current);
    shownIndexRef.current = index;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce || durationMs <= 0) {
      const rest = restSlots(items, index);
      rotRef.current = index;
      setSlots(rest);
      setBlur(0);
      onModeRef.current?.("rest", Math.abs(index - from));
      return;
    }

    const journey = buildJourney(items, from, index);
    setSlots(journey.slots);
    onModeRef.current?.(journey.mode, journey.distance);

    const spin = journey.end - journey.start;
    // Blur from real speed: px moved per frame. Long jumps get a stronger shutter.
    const shutter = journey.mode === "blur" ? 1.1 : 0.45;
    const t0 = performance.now();

    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const rot = journey.start + spin * easeInOutCubic(t);
      rotRef.current = rot;
      paint(rot, journey.slots);

      // Instant speed in px/s, from the ease's slope at t.
      const slope = t < 0.5 ? 12 * t * t : 3 * (-2 * t + 2) ** 2;
      const pxPerSec = (Math.abs(spin) * slope * lineRef.current) / (durationMs / 1000);
      setBlur(t < 1 ? Math.min(14, pxPerSec * 0.016 * shutter) : 0);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      rotRef.current = index;
      setSlots(restSlots(items, index));
      setBlur(0);
      onModeRef.current?.("rest", journey.distance);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only spin on index change
  }, [index]);

  // Rebuild the rest view only when the list of names itself changes.
  const itemsRef = useRef(items);
  useEffect(() => {
    if (itemsRef.current === items) return;
    itemsRef.current = items;
    cancelAnimationFrame(rafRef.current);
    shownIndexRef.current = index;
    rotRef.current = index;
    setSlots(restSlots(items, index));
    setBlur(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- list changes only
  }, [items]);

  // Paint once React has mounted the current slots.
  useLayoutEffect(() => {
    paint(rotRef.current, slots);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paint reads refs
  }, [slots]);

  const justify = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <span
      className={`relative block ${className}`}
      // Long names are clipped sideways; the faded names above and below stay visible.
      style={{ overflowX: "clip" }}
    >
      <span className="sr-only">{items[index] || ""}</span>
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <filter id={filterId} x="-5%" y="-50%" width="110%" height="200%">
          <feGaussianBlur ref={blurRef} stdDeviation="0 0" />
        </filter>
      </svg>
      {/* Sizes the line and keeps the accessible text in flow. */}
      <span ref={measureRef} aria-hidden className="invisible block whitespace-nowrap">
        {shown(items[index] ?? "")}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0"
        style={{
          top: peek ? `-${peekReach}em` : 0,
          bottom: peek ? `-${peekReach}em` : 0,
          overflow: "hidden",
          filter: `url(#${filterId})`,
          maskImage: peek
            ? // Neighbours sink into the background toward the edges.
              "linear-gradient(to bottom, transparent 0, rgb(0 0 0 / 0.22) 18%, #000 38%, #000 62%, rgb(0 0 0 / 0.22) 82%, transparent 100%)"
            : undefined,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ perspective: "28em", perspectiveOrigin: "50% 50%" }}
        >
          {slots.map((s) => (
            <span
              key={s.key}
              ref={(el) => {
                if (el) itemRefs.current.set(s.key, el);
                else itemRefs.current.delete(s.key);
              }}
              className="absolute inset-x-0 top-1/2 flex whitespace-nowrap will-change-transform"
              style={{
                justifyContent: justify,
                marginTop: "-0.5lh",
                lineHeight: "inherit",
                backfaceVisibility: "hidden",
                opacity: 0,
              }}
            >
              {shown(s.label)}
            </span>
          ))}
        </div>
      </span>
    </span>
  );
}
