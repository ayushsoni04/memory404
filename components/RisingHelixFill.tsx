"use client";

import { useMemo } from "react";
import { useCyclePhase, usePrefersReducedMotion } from "@/lib/dotmatrix-hooks";

const MATRIX = 5;
const SIZE = 36;
const DOT = 5;
const GAP = Math.max(0, (SIZE - MATRIX * DOT) / (MATRIX - 1));

const BASE_OPACITY = 0.08;
const STRAND_OPACITY = 1;
const BRIDGE_OPACITY = 0.58;
const NEAR_STRAND_OPACITY = 0.24;
const STEP_COUNT = 20;
const HELIX_LOOP_RADIANS = (Math.PI * 2) / (STEP_COUNT - 1);

type Props = {
  active?: boolean;
  className?: string;
};

/**
 * Helix Core opacity math from dotm-square-16, fixed 5×5 / default dot size.
 * Rises from the card bottom and stops in the lower half (50% height band).
 */
export function RisingHelixFill({ active = true, className }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const animPhase = useCyclePhase({
    active: Boolean(active && !reducedMotion),
    cycleMsBase: 1400,
    speed: 2.5,
  });

  const opacities = useMemo(() => {
    const t = reducedMotion ? 0 : animPhase * STEP_COUNT;
    const cells: number[] = [];
    for (let row = 0; row < MATRIX; row += 1) {
      const rowPhase = t * HELIX_LOOP_RADIANS + row * 1.24;
      const left = Math.round(1.5 + 0.5 * Math.sin(rowPhase));
      const right = 4 - left;
      const bridgeOn = Math.cos(rowPhase * 2) > 0.82;
      for (let col = 0; col < MATRIX; col += 1) {
        if (col === left || col === right) {
          cells.push(STRAND_OPACITY);
        } else if (bridgeOn && col > left && col < right) {
          cells.push(BRIDGE_OPACITY);
        } else if (Math.abs(col - left) === 1 || Math.abs(col - right) === 1) {
          cells.push(NEAR_STRAND_OPACITY);
        } else {
          cells.push(BASE_OPACITY);
        }
      }
    }
    return cells;
  }, [animPhase, reducedMotion]);

  return (
    <div
      className={`rising-helix-shell pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="rising-helix-band">
        <div
          className="rising-helix-grid"
          style={{
            width: SIZE,
            height: SIZE,
            gap: GAP,
            gridTemplateColumns: `repeat(${MATRIX}, ${DOT}px)`,
            gridTemplateRows: `repeat(${MATRIX}, ${DOT}px)`,
          }}
        >
          {opacities.map((opacity, i) => (
            <span
              key={i}
              className="rising-helix-dot"
              style={{
                width: DOT,
                height: DOT,
                opacity,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
