"use client";

import { useEffect, useState } from "react";

/**
 * Departure Mono–style cognate glitch (from departuremono.com).
 * Periodically swaps characters for lookalikes, with occasional burst flickers.
 */
const COGNATES: Record<string, string> = {
  E: "3ΣΞ€Ǝ",
  A: "Λ",
  R: "2₹",
  T: "7",
  U: "Ʉ",
  " ": "_",
  O: "0",
  N: "Ɲ",
  "4": "AΛ¥",
  "0": "OØ",
  M: "Ɱ",
  Y: "¥",
  I: "1!",
  S: "$5",
  L: "1£",
  D: "Ð",
  C: "Ɔ",
  G: "6ɢ",
  B: "8ß",
  P: "Þ",
  H: "Һ",
  F: "Ƒ",
  K: "Ƙ",
  V: "Ѵ",
  W: "Ԝ",
  X: "Χ",
  Z: "2Ƶ",
};

const MIN_DELAY = 400;
const MAX_DELAY = 2000;
const GLITCH_CHANCE = 0.1;
const GLITCH_DELAY = 30;

function sample<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function natural(maxExclusive: number): number {
  return Math.floor(Math.random() * Math.max(maxExclusive, 1));
}

function permutation(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function glitchWord(original: string, odds: number[]): string {
  const swaps = sample(odds);
  if (swaps === 0) return original;

  const glitched = [...original];
  const opts =
    original.length === 1 ? [0] : permutation(original.length);
  const count = Math.min(swaps, opts.length);
  for (let i = 0; i < count; i++) {
    const idx = opts[i]!;
    const ch = original[idx]!;
    const pool = COGNATES[ch] ?? COGNATES[ch.toUpperCase()];
    if (!pool) continue;
    glitched[idx] = sample([...pool]);
  }
  return glitched.join("");
}

type Props = {
  children: string;
  className?: string;
  as?: "span" | "h1" | "h2";
};

export default function GlitchText({
  children,
  className = "",
  as: Tag = "span",
}: Props) {
  const target = children;
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    setDisplay(target);

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let cancelled = false;
    const timers = new Set<number>();

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!cancelled) fn();
      }, ms);
      timers.add(id);
    };

    const tick = () => {
      if (cancelled) return;
      setDisplay(glitchWord(target, [0, 0, 0, 1, 1, 2, 2, 2, 3]));

      if (Math.random() < GLITCH_CHANCE) {
        const delay = natural(MAX_DELAY - MIN_DELAY) + MIN_DELAY;
        const burst = glitchWord(target, [2, 3, 4, 4, 5, 5, 5, 6, 6]);
        later(() => setDisplay(target), delay);
        later(() => setDisplay(burst), delay + GLITCH_DELAY);
        later(() => setDisplay(target), delay + GLITCH_DELAY * 2);
        later(() => setDisplay(burst), delay + GLITCH_DELAY * 3);
        later(tick, delay + GLITCH_DELAY * 4);
      } else {
        later(tick, natural(MAX_DELAY - MIN_DELAY) + MIN_DELAY);
      }
    };

    later(tick, natural(MAX_DELAY - MIN_DELAY) + MIN_DELAY);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, [target]);

  return (
    <Tag
      className={`font-departure ${className}`.trim()}
      aria-label={target}
    >
      {display}
    </Tag>
  );
}
