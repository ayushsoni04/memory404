"use client";

import { useEffect, useRef, type RefObject } from "react";
import "./sidebar-readouts.css";

/**
 * Faint spec-sheet readouts scattered down the sidebar, like a lab poster.
 * Words scramble on their own, a few at a time, without needing hover.
 */
const BLOCKS: { rows: string[][]; width: string; align: "start" | "end" | "center" }[] = [
  { rows: [["MEMORY", "----"], ["/", "LINK", "VAULT"]], width: "60%", align: "start" },
  { rows: [["IDX", "///"], [">", "N.", "0404"]], width: "46%", align: "end" },
  { rows: [["NOT", "FOUND"], [">", "FOUND", "AGAIN"]], width: "52%", align: "start" },
  { rows: [["REV.", "11.26"], ["404", "///", "LAB"]], width: "44%", align: "end" },
];

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\[]{}?!$@";
/** How often scrambling glyphs change. */
const TICK_MS = 55;
/** How often a new word starts scrambling. */
const SPAWN_MS = 140;
/** Most words scrambling at once. */
const MAX_ACTIVE = 4;
const SCRAMBLE_MS = [420, 900] as const;
const DECODE_MS = 300;

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
const scramble = (word: string, keep: number) =>
  [...word].map((ch, i) => (i < keep || ch === " " ? ch : randomGlyph())).join("");

/** One justified row of readout words. Each word can scramble (see useReadoutScramble). */
export function ReadoutRow({ words }: { words: string[] }) {
  return (
    <span className="sig-meta-row">
      {words.map((w, i) => (
        <span key={i} data-word={w}>
          {w}
        </span>
      ))}
    </span>
  );
}

/**
 * Makes the readout words under `rootRef` scramble on their own: a few at a
 * time, each for a moment, then decode back left to right. Text is edited in
 * place, so React never re-renders.
 */
export function useReadoutScramble(
  rootRef: RefObject<HTMLElement | null>,
  maxActive = MAX_ACTIVE,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const spans = [...root.querySelectorAll<HTMLSpanElement>("[data-word]")];
    const active = new Map<HTMLSpanElement, { start: number; until: number }>();
    let lastSpawn = 0;
    let lastTick = 0;
    let raf = 0;

    const set = (el: HTMLSpanElement, text: string) => {
      const node = el.firstChild;
      if (node && node.nodeType === Node.TEXT_NODE && node.nodeValue !== text) node.nodeValue = text;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Skip work while the field is hidden (phones) or the tab is in the background.
      if (root.offsetParent === null) return;
      if (now - lastSpawn > SPAWN_MS && active.size < maxActive) {
        lastSpawn = now;
        const idle = spans.filter((el) => !active.has(el));
        const el = idle[Math.floor(Math.random() * idle.length)];
        if (el) {
          const len = SCRAMBLE_MS[0] + Math.random() * (SCRAMBLE_MS[1] - SCRAMBLE_MS[0]);
          active.set(el, { start: now, until: now + len });
        }
      }
      if (now - lastTick < TICK_MS) return;
      lastTick = now;
      for (const [el, t] of active) {
        const word = el.dataset.word ?? "";
        if (now < t.until) {
          set(el, scramble(word, 0));
          continue;
        }
        const keep = Math.floor(((now - t.until) / DECODE_MS) * word.length);
        if (keep >= word.length) {
          set(el, word);
          active.delete(el);
        } else {
          set(el, scramble(word, keep));
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      for (const el of spans) set(el, el.dataset.word ?? "");
    };
  }, [rootRef, maxActive]);
}

export function SidebarReadoutField() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useReadoutScramble(rootRef);

  return (
    <div ref={rootRef} className="sidebar-readouts" aria-hidden>
      {BLOCKS.map((block, b) => (
        <div
          key={b}
          className="sidebar-readout-block"
          style={{ width: block.width, alignSelf: `flex-${block.align}`.replace("flex-center", "center") }}
        >
          {block.rows.map((words, r) => (
            <ReadoutRow key={r} words={words} />
          ))}
        </div>
      ))}
    </div>
  );
}
