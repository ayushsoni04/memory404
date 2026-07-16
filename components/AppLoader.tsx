"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  applyShellStroke,
  clearShellStroke,
} from "@/lib/card-vicinity-stroke";

type Glyph = { width: number; data: number[] };

/** 7-row bitmap glyphs (binary strings → bitmasks). */
const FONT: Record<string, Glyph> = {
  L: {
    width: 5,
    data: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  },
  O: {
    width: 5,
    data: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  },
  A: {
    width: 5,
    data: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  },
  D: {
    width: 5,
    data: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  },
  I: {
    width: 3,
    data: [0b111, 0b010, 0b010, 0b010, 0b010, 0b010, 0b111],
  },
  N: {
    width: 5,
    data: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  },
  G: {
    width: 5,
    data: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  },
  " ": {
    width: 5,
    data: [0, 0, 0, 0, 0, 0, 0],
  },
};

/** Small filled shapes between LOADING words (~25% smaller, centered in 7 rows). */
const SHAPES: Glyph[] = [
  // • bullet
  {
    width: 2,
    data: [0b00, 0b00, 0b00, 0b11, 0b00, 0b00, 0b00],
  },
  // triangle (filled)
  {
    width: 3,
    data: [0b000, 0b000, 0b010, 0b111, 0b000, 0b000, 0b000],
  },
  // square (filled)
  {
    width: 2,
    data: [0b00, 0b00, 0b11, 0b11, 0b00, 0b00, 0b00],
  },
  // hexagon (filled)
  {
    width: 3,
    data: [0b000, 0b010, 0b111, 0b111, 0b010, 0b000, 0b000],
  },
  // pentagon (filled)
  {
    width: 3,
    data: [0b000, 0b010, 0b111, 0b111, 0b000, 0b000, 0b000],
  },
];

const FONT_HEIGHT = 7;
const CHAR_SPACING = 2;
const ROWS = 7;
const GAP: Glyph = FONT[" "]!;

const PALETTE = {
  background: "#080808",
  inactive: "#292929",
  active: "#e9e9e2",
};

type AppLoaderProps = {
  /** Ignored — strip is width-driven. Kept for call-site compatibility. */
  size?: number;
  label?: string;
  className?: string;
  /** Inline strip for buttons / overlays (auto width, tighter cells). */
  compact?: boolean;
  /** Kept for call-site compatibility; matrix always scrolls LOADING. */
  progressive?: boolean;
};

function buildWord(word: string): Glyph[] {
  return Array.from(word.toUpperCase()).map((ch) => FONT[ch] ?? GAP);
}

function pickShape(rng: () => number): Glyph {
  return SHAPES[Math.floor(rng() * SHAPES.length)]!;
}

/** LOADING + random shape separators, repeated for a long marquee. */
function buildScrollChars(rng: () => number): Glyph[] {
  const out: Glyph[] = [];
  for (let i = 0; i < 8; i++) {
    out.push(...buildWord("LOADING"));
    out.push(GAP, GAP);
    out.push(pickShape(rng));
    out.push(GAP, GAP);
  }
  return out;
}

function measureBitmapWidth(chars: Glyph[], charSpacing: number) {
  return chars.reduce((acc, c) => acc + c.width + charSpacing, 0);
}

/** Deterministic PRNG so the sequence is stable for the effect lifetime. */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function AppLoader({
  label,
  className,
  compact = false,
}: AppLoaderProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aria = label?.trim() || "loading";

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars = buildScrollChars(mulberry32((Date.now() ^ 0x9e3779b9) >>> 0));
    const bitmapWidth = measureBitmapWidth(chars, CHAR_SPACING);
    const baseCell = compact ? 3 : 4;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let cols = 1;
    let cellSize = baseCell;
    let cellPadding = cellSize * 0.22;
    let widthCss = baseCell;
    let heightCss = ROWS * baseCell;
    let dpr = window.devicePixelRatio || 1;
    let cursorOffset = 0;
    let raf = 0;
    let lastTs: number | null = null;
    let accMs = 0;
    const frameMs = 1000 / 24;
    const scrollSpeed = compact ? -0.35 : -0.55;

    const drawCell = (
      col: number,
      row: number,
      color: string,
      glow: boolean,
    ) => {
      const centerX = col * cellSize + cellSize / 2;
      const centerY = row * cellSize + cellSize / 2;
      const radius = Math.max(0.4, cellSize / 2 - cellPadding);

      if (glow) {
        ctx.save();
        ctx.shadowBlur = cellSize * 1.2;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const paint = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = PALETTE.background;
      ctx.fillRect(0, 0, widthCss, heightCss);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < cols; c++) {
          drawCell(c, r, PALETTE.inactive, false);
        }
      }

      const normalized =
        ((cursorOffset % bitmapWidth) + bitmapWidth) % bitmapWidth;
      const firstStart = normalized - bitmapWidth;

      for (
        let base = firstStart;
        base < cols + bitmapWidth;
        base += bitmapWidth
      ) {
        let cursor = base;
        for (const ch of chars) {
          for (let y = 0; y < FONT_HEIGHT; y++) {
            const rowBits = ch.data[y] ?? 0;
            for (let x = 0; x < ch.width; x++) {
              const on = (rowBits >> (ch.width - 1 - x)) & 1;
              if (!on) continue;
              const col = Math.floor(cursor + x);
              if (col >= 0 && col < cols && y < ROWS) {
                drawCell(col, y, PALETTE.active, true);
              }
            }
          }
          cursor += ch.width + CHAR_SPACING;
        }
      }
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const containerWidth = Math.max(
        container.clientWidth,
        compact ? 120 : 1,
      );
      cols = Math.max(1, Math.floor(containerWidth / baseCell));
      // Stretch cells so the grid fills the full container width.
      cellSize = containerWidth / cols;
      cellPadding = cellSize * 0.22;
      widthCss = containerWidth;
      heightCss = ROWS * cellSize;
      canvas.style.width = `${widthCss}px`;
      canvas.style.height = `${heightCss}px`;
      canvas.width = Math.floor(widthCss * dpr);
      canvas.height = Math.floor(heightCss * dpr);
      paint();
    };

    const tick = (ts: number) => {
      if (lastTs === null) lastTs = ts;
      let delta = ts - lastTs;
      lastTs = ts;
      if (delta > 100) delta = 100;

      if (!reducedMotion) {
        accMs += delta;
        while (accMs >= frameMs) {
          accMs -= frameMs;
          cursorOffset += scrollSpeed;
        }
      }

      paint();
      raf = window.requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    raf = window.requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [compact]);

  return (
    <div
      ref={shellRef}
      role="status"
      aria-label={aria}
      aria-live="polite"
      className={cn(
        "mind-card-shell relative w-full overflow-hidden bg-black p-1 !rounded-lg",
        compact ? "inline-flex min-w-[7.5rem]" : "flex",
        className,
      )}
      style={{ borderRadius: 8 }}
      onPointerMove={(e) => {
        const shell = e.currentTarget;
        const tracked = shell as HTMLElement & {
          __strokeX?: number;
          __strokeY?: number;
        };
        tracked.__strokeX = e.clientX;
        tracked.__strokeY = e.clientY;
        if (shell.dataset.strokeRaf) return;
        shell.dataset.strokeRaf = "1";
        requestAnimationFrame(() => {
          delete shell.dataset.strokeRaf;
          applyShellStroke(
            shell,
            tracked.__strokeX ?? 0,
            tracked.__strokeY ?? 0,
          );
        });
      }}
      onPointerLeave={(e) => {
        clearShellStroke(e.currentTarget);
      }}
    >
      <span className="mind-card-stroke" aria-hidden />
      <div ref={containerRef} className="relative z-[1] w-full">
        <canvas ref={canvasRef} className="block w-full" aria-hidden />
      </div>
    </div>
  );
}
