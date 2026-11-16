"use client";

import { useId } from "react";

export const SPRAY_BODY =
  "Every link you save is a thought you meant to keep. Not the tab you closed, not the page that moved, not the note you lost in a pile of open windows. Memory 404 holds what the internet forgets, so that nothing you found is ever not found again.";

type Props = {
  /** Light paper or the dark app background. */
  tone?: "light" | "dark";
  /** "memory" above "404", or one line. */
  layout?: "stacked" | "line";
  /** 0 = tight marker, 1 = loose airbrush with lots of overspray. */
  spray?: number;
  /** Degrees; the reference leans up to the right. */
  tilt?: number;
  /** Changes the speckle pattern. */
  seed?: number;
  color?: string;
  body?: string;
  className?: string;
};

/**
 * "memory 404" sprayed over a justified serif paragraph. The spray is an SVG
 * filter: a soft halo of the letters, broken up by noise so the paint thins
 * into speckles at the edges, over a denser core.
 */
export function SprayWordmark({
  tone = "light",
  layout = "stacked",
  spray = 0.55,
  tilt = -8,
  seed = 7,
  color = "#ff1d12",
  body = SPRAY_BODY,
  className = "",
}: Props) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const s = Math.min(1, Math.max(0, spray));
  // Wider halo and more holes as spray goes up.
  const halo = 5 + s * 9;
  const core = 0.6 + s * 1.4;
  const holes = 0.7 + s * 0.35;
  const light = tone === "light";

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={{
        background: light ? "#efeeea" : "#070708",
        color: light ? "#1d1c1a" : "#cfcdc8",
      }}
    >
      {/* Paper grain */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]" aria-hidden>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix
            values={
              light
                ? "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 0.62"
                : "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.2 -0.78"
            }
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id}-grain)`} />
      </svg>

      <p
        className="relative mx-auto flex h-full max-w-[86%] items-center font-serif uppercase leading-[1.18] tracking-[0.01em]"
        style={{
          fontSize: "clamp(11px, 3.1cqw, 26px)",
          textAlign: "justify",
          textAlignLast: "justify",
          hyphens: "none",
        }}
      >
        {body}
      </p>

      <svg
        viewBox="0 0 1000 560"
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: light ? "multiply" : "normal" }}
        role="img"
        aria-label="memory 404"
      >
        <defs>
          <filter id={`${id}-spray`} x="-25%" y="-40%" width="150%" height="180%" colorInterpolationFilters="sRGB">
            {/* Halo of the letters: where the paint can land */}
            <feGaussianBlur in="SourceAlpha" stdDeviation={halo} result="halo" />
            {/* Fine noise moved into the alpha channel */}
            <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="1" seed={seed} result="noise" />
            <feColorMatrix
              in="noise"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.3"
              result="noiseA"
            />
            {/* Denser paint where the halo is strong, speckles where it thins */}
            <feComposite in="halo" in2="noiseA" operator="arithmetic" k1="0" k2="1.35" k3={-holes} k4="0.28" result="mixed" />
            <feComponentTransfer in="mixed" result="specks">
              <feFuncA type="linear" slope="9" intercept="-3.6" />
            </feComponentTransfer>
            {/* Solid wet core along the stroke */}
            <feGaussianBlur in="SourceAlpha" stdDeviation={core} result="coreBlur" />
            <feComponentTransfer in="coreBlur" result="core">
              <feFuncA type="linear" slope="1.4" intercept="-0.15" />
            </feComponentTransfer>
            <feMerge result="paintA">
              <feMergeNode in="specks" />
              <feMergeNode in="core" />
            </feMerge>
            <feFlood floodColor={color} result="ink" />
            <feComposite in="ink" in2="paintA" operator="in" result="paint" />
            {/* A faint mist past the speckles */}
            <feGaussianBlur in="paint" stdDeviation={2 + s * 5} result="mist" />
            <feComponentTransfer in="mist" result="mistSoft">
              <feFuncA type="linear" slope={0.35 + s * 0.3} />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="mistSoft" />
              <feMergeNode in="paint" />
            </feMerge>
          </filter>
        </defs>

        <g
          transform={`rotate(${tilt} 500 280)`}
          filter={`url(#${id}-spray)`}
          fill="#000"
          style={{ fontFamily: "var(--font-spray), 'Brush Script MT', cursive" }}
        >
          {layout === "stacked" ? (
            <>
              <text x="470" y="290" textAnchor="middle" fontSize="250">
                memory
              </text>
              <text x="650" y="470" textAnchor="middle" fontSize="210">
                404
              </text>
            </>
          ) : (
            <text x="500" y="350" textAnchor="middle" fontSize="178">
              memory 404
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
