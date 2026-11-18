"use client";

import { useEffect, useState } from "react";
import { STAR } from "../vault/OutroSparkles";
import "../vault/outro-sparkles.css";

type Sparkle = { id: number; x: number; y: number; size: number; rot: number; dot: boolean };

const COUNT = 12;
const SPREAD_MS = 750;
const LIFE_MS = 1100;

let nextId = 0;

/**
 * A burst of the closing line's stars across the top bar, played each time
 * `burst` changes (a tap on the brain). Fills its positioned parent.
 */
export function TapSparkles({ burst }: { burst: number }) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    if (burst === 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      timers.push(
        window.setTimeout(() => {
          const sparkle: Sparkle = {
            id: ++nextId,
            x: 2 + Math.random() * 96,
            y: 12 + Math.random() * 76,
            size: 9 + Math.random() * 12,
            rot: Math.random() * 40 - 20,
            dot: Math.random() < 0.6,
          };
          setSparkles((prev) => [...prev, sparkle]);
          timers.push(
            window.setTimeout(() => {
              setSparkles((prev) => prev.filter((s) => s.id !== sparkle.id));
            }, LIFE_MS),
          );
        }, (i / COUNT) * SPREAD_MS + Math.random() * 60),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [burst]);

  return (
    <span className="tap-sparkles" aria-hidden>
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
