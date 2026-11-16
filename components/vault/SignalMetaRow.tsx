"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\[]{}?!$@";
/** How often the scrambled glyphs change while hovered. */
const SCRAMBLE_MS = 55;
/** How long a word takes to decode back after the pointer leaves it. */
const DECODE_MS = 320;
/** Extra hit area around each word, so short words like "/" are easy to land on. */
const HIT_PAD_X = 6;
const HIT_PAD_Y = 3;

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

/** Same length as the word, so the justified row never shifts. */
function scrambleWord(word: string, keep: number) {
  let out = "";
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    out += i < keep || ch === " " ? ch : randomGlyph();
  }
  return out;
}

/**
 * One justified row of mono words, spread edge to edge like a spec sheet.
 * Hovering a word scrambles just that word; leaving decodes it back left to
 * right. The pointer is hit-tested by position, so rows that sit behind other
 * content (like the sidebar poster) still react.
 */
export function SignalMetaRow({ words }: { words: readonly string[] }) {
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [hovered, setHovered] = useState(-1);
  const hoveredRef = useRef(-1);

  // Hit-test the pointer against each word.
  useEffect(() => {
    let raf = 0;
    let x = -1;
    let y = -1;
    const setIndex = (i: number) => {
      if (i === hoveredRef.current) return;
      hoveredRef.current = i;
      setHovered(i);
    };
    const check = () => {
      raf = 0;
      const spans = wordRefs.current;
      if (!spans[0] || spans[0].offsetParent === null) {
        setIndex(-1);
        return;
      }
      let hit = -1;
      for (let i = 0; i < spans.length; i++) {
        const el = spans[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (
          x >= r.left - HIT_PAD_X &&
          x <= r.right + HIT_PAD_X &&
          y >= r.top - HIT_PAD_Y &&
          y <= r.bottom + HIT_PAD_Y
        ) {
          hit = i;
          break;
        }
      }
      setIndex(hit);
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(check);
    };
    const onLeaveWindow = () => {
      x = -1;
      y = -1;
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
    };
  }, []);

  // Per-word timers: the hovered word scrambles, a word just left decodes.
  const timersRef = useRef(new Map<number, number>());
  const prevHoveredRef = useRef(-1);

  useEffect(() => {
    const spans = wordRefs.current;
    const timers = timersRef.current;
    const paint = (i: number, text: string) => {
      // Edit React's own text node in place so later renders still land.
      const node = spans[i]?.firstChild;
      if (node && node.nodeType === Node.TEXT_NODE && node.nodeValue !== text) {
        node.nodeValue = text;
      }
    };
    const stop = (i: number) => {
      const id = timers.get(i);
      if (id !== undefined) {
        window.clearInterval(id);
        window.clearTimeout(id);
        timers.delete(i);
      }
    };
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const prev = prevHoveredRef.current;
    prevHoveredRef.current = hovered;

    // Decode the word the pointer just left.
    if (prev >= 0 && prev !== hovered && prev < words.length) {
      stop(prev);
      const word = words[prev];
      if (reduce) {
        paint(prev, word);
      } else {
        const t0 = performance.now();
        const step = () => {
          const keep = Math.floor(((performance.now() - t0) / DECODE_MS) * word.length);
          if (keep >= word.length) {
            paint(prev, word);
            timers.delete(prev);
            return;
          }
          paint(prev, scrambleWord(word, keep));
          timers.set(prev, window.setTimeout(step, SCRAMBLE_MS));
        };
        step();
      }
    }

    // Scramble the word under the pointer.
    if (hovered >= 0 && hovered < words.length) {
      stop(hovered);
      const word = words[hovered];
      const tick = () => paint(hovered, scrambleWord(word, 0));
      tick();
      if (!reduce) timers.set(hovered, window.setInterval(tick, SCRAMBLE_MS));
    }
  }, [hovered, words]);

  // New words (a count changed): show them as-is unless that word is hovered.
  useEffect(() => {
    const timers = timersRef.current;
    words.forEach((w, i) => {
      if (i === hoveredRef.current || timers.has(i)) return;
      const node = wordRefs.current[i]?.firstChild;
      if (node && node.nodeType === Node.TEXT_NODE && node.nodeValue !== w) {
        node.nodeValue = w;
      }
    });
  }, [words]);

  // Stop every timer on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of timers.values()) {
        window.clearInterval(id);
        window.clearTimeout(id);
      }
      timers.clear();
    };
  }, []);

  return (
    <span className="sig-meta-row" data-scrambling={hovered >= 0 || undefined}>
      {words.map((word, index) => (
        // The revision stamp is a date, so server and client may differ at midnight.
        <span
          key={index}
          ref={(el) => {
            wordRefs.current[index] = el;
          }}
          suppressHydrationWarning
        >
          {word}
        </span>
      ))}
    </span>
  );
}
