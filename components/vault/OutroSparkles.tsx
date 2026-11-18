"use client";

import { useEffect, useState } from "react";
import "./outro-sparkles.css";

type Sparkle = { id: number; x: number; y: number; size: number; rot: number; dot: boolean };

const SPAWN_MS = 520;
const LIFE_MS = 1100;
const MAX = 6;

/** Four-point star with soft, pinched sides. */
export const STAR =
  "M12 0C12.6 6.2 17.8 11.4 24 12 17.8 12.6 12.6 17.8 12 24 11.4 17.8 6.2 12.6 0 12 6.2 11.4 11.4 6.2 12 0Z";

/**
 * Little stars that pop in, twinkle and fade at random spots around the
 * closing line, after 60fps.design's hero. Paused for reduced motion and
 * while the tab is hidden.
 */
export function OutroSparkles() {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const now = ++id;
      // Mostly around the edges of the words, now and then over them.
      const edge = Math.random() < 0.75;
      const x = edge ? (Math.random() < 0.5 ? Math.random() * 14 : 86 + Math.random() * 14) : 10 + Math.random() * 80;
      const y = edge ? Math.random() * 100 : Math.random() < 0.5 ? Math.random() * 18 : 82 + Math.random() * 18;
      const sparkle: Sparkle = {
        id: now,
        x,
        y,
        size: 10 + Math.random() * 14,
        rot: Math.random() * 40 - 20,
        dot: Math.random() < 0.6,
      };
      setSparkles((prev) => [...prev.slice(-(MAX - 1)), sparkle]);
      window.setTimeout(() => {
        setSparkles((prev) => prev.filter((s) => s.id !== now));
      }, LIFE_MS);
    }, SPAWN_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="outro-sparkles" aria-hidden>
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="outro-sparkle"
          style={
            {
              left: `${s.x}%`,
              top: `${s.y}%`,
              "--s": `${s.size}px`,
              "--r": `${s.rot}deg`,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%">
            <path d={STAR} />
          </svg>
          {s.dot ? <span className="outro-sparkle-dot" /> : null}
        </span>
      ))}
    </span>
  );
}
