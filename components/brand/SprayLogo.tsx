"use client";

import { useId } from "react";

/**
 * Compact layouts that stay in the sidebar's top corner:
 * - line: "memory 404" on one line, slight lean
 * - flat: one line, no lean
 * - stack: "404" tucked under the end of "memory", slight lean
 * - tag: "memory" with a small raised "404", like a tag
 */
export type SprayLogoVariant = "line" | "flat" | "stack" | "tag";

const LAYOUTS: Record<
  SprayLogoVariant,
  { viewBox: string; tilt: number; texts: { x: number; y: number; size: number; text: string }[] }
> = {
  line: { viewBox: "0 0 400 110", tilt: -4, texts: [{ x: 200, y: 78, size: 82, text: "memory 404" }] },
  flat: { viewBox: "0 0 400 100", tilt: 0, texts: [{ x: 200, y: 70, size: 82, text: "memory 404" }] },
  stack: {
    viewBox: "0 0 300 150",
    tilt: -4,
    texts: [
      { x: 140, y: 78, size: 86, text: "memory" },
      { x: 230, y: 136, size: 58, text: "404" },
    ],
  },
  tag: {
    viewBox: "0 0 360 110",
    tilt: -3,
    texts: [
      { x: 145, y: 84, size: 90, text: "memory" },
      { x: 312, y: 44, size: 46, text: "404" },
    ],
  },
};

type Props = {
  variant?: SprayLogoVariant;
  color?: string;
  /** Degrees; overrides the layout's own lean. */
  tilt?: number;
  className?: string;
};

/**
 * Small "memory 404" sprayed in red, for the sidebar. Same spray recipe as
 * SprayWordmark (soft halo + noise speckles + wet core), tuned for a small
 * size and no paper behind it.
 */
export function SprayLogo({
  variant = "line",
  color = "#f5f5f2",
  tilt,
  className = "",
}: Props) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const layout = LAYOUTS[variant];
  const [, , vbW, vbH] = layout.viewBox.split(" ").map(Number);
  const lean = tilt ?? layout.tilt;

  return (
    <svg
      viewBox={layout.viewBox}
      className={`block overflow-visible ${className}`}
      role="img"
      aria-label="memory 404"
    >
      <defs>
        <filter id={`${id}-spray`} x="-20%" y="-30%" width="140%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="halo" />
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="7" result="noise" />
          <feColorMatrix in="noise" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.3" result="noiseA" />
          <feComposite in="halo" in2="noiseA" operator="arithmetic" k1="0" k2="1.35" k3="-0.85" k4="0.28" result="mixed" />
          <feComponentTransfer in="mixed" result="specks">
            <feFuncA type="linear" slope="9" intercept="-3.6" />
          </feComponentTransfer>
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.9" result="coreBlur" />
          <feComponentTransfer in="coreBlur" result="core">
            <feFuncA type="linear" slope="1.4" intercept="-0.15" />
          </feComponentTransfer>
          <feMerge result="paintA">
            <feMergeNode in="specks" />
            <feMergeNode in="core" />
          </feMerge>
          <feFlood floodColor={color} result="ink" />
          <feComposite in="ink" in2="paintA" operator="in" result="paint" />
          <feGaussianBlur in="paint" stdDeviation="3" result="mist" />
          <feComponentTransfer in="mist" result="mistSoft">
            <feFuncA type="linear" slope="0.45" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="mistSoft" />
            <feMergeNode in="paint" />
          </feMerge>
        </filter>
      </defs>
      <g
        transform={`rotate(${lean} ${vbW / 2} ${vbH / 2})`}
        filter={`url(#${id}-spray)`}
        fill="#000"
        style={{ fontFamily: "var(--font-spray), 'Brush Script MT', cursive" }}
      >
        {layout.texts.map((t) => (
          <text key={t.text} x={t.x} y={t.y} textAnchor="middle" fontSize={t.size}>
            {t.text}
          </text>
        ))}
      </g>
    </svg>
  );
}
