"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  applyShellStroke,
  clearShellStroke,
} from "@/lib/card-vicinity-stroke";
import {
  buildGlyphs,
  FONT_HEIGHT,
  measureBitmapWidth,
  type DigitalScreenConfig,
} from "@/lib/digital-screen";

type DigitalScreenProps = {
  config: DigitalScreenConfig;
  className?: string;
  label?: string;
  /** When true, pointer paints/erases cells instead of only previewing. */
  interactive?: boolean;
  paintMode?: "paint" | "erase" | "toggle";
  onPaintChange?: (painted: boolean[]) => void;
};

function cellFromPointer(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  cols: number,
  rows: number,
  cellSize: number,
) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * (cols * cellSize);
  const y = ((clientY - rect.top) / rect.height) * (rows * cellSize);
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
  return { col, row, index: row * cols + col };
}

export function DigitalScreen({
  config,
  className,
  label,
  interactive = false,
  paintMode = "paint",
  onPaintChange,
}: DigitalScreenProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintedRef = useRef(config.painted);
  const paintModeRef = useRef(paintMode);
  const onPaintChangeRef = useRef(onPaintChange);
  const drawingRef = useRef(false);
  const lastPaintedIndexRef = useRef<number | null>(null);
  const paintValueRef = useRef(true);

  paintedRef.current = config.painted;
  paintModeRef.current = paintMode;
  onPaintChangeRef.current = onPaintChange;

  const {
    cols,
    rows,
    cellSize,
    cellPaddingRatio,
    background,
    inactive,
    active,
    glow,
    glowBlur,
    glowHighlight,
    contentMode,
    marqueeText,
    marqueeSpeed,
    fps,
    charSpacing,
  } = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const glyphs = buildGlyphs(marqueeText || " ");
    const bitmapWidth = Math.max(
      1,
      measureBitmapWidth(glyphs, charSpacing),
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const widthCss = cols * cellSize;
    const heightCss = rows * cellSize;
    let dpr = window.devicePixelRatio || 1;
    let cursorOffset = 0;
    let raf = 0;
    let lastTs: number | null = null;
    let accMs = 0;
    const frameMs = 1000 / Math.max(1, fps);

    const syncCanvasSize = () => {
      dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${widthCss}px`;
      canvas.style.height = `${heightCss}px`;
      canvas.width = Math.floor(widthCss * dpr);
      canvas.height = Math.floor(heightCss * dpr);
    };

    const drawCell = (
      col: number,
      row: number,
      color: string,
      lit: boolean,
    ) => {
      const centerX = col * cellSize + cellSize / 2;
      const centerY = row * cellSize + cellSize / 2;
      const radius = Math.max(
        0.35,
        cellSize / 2 - cellSize * cellPaddingRatio,
      );

      if (lit && glow) {
        ctx.save();
        ctx.shadowBlur = cellSize * glowBlur;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (glowHighlight) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const paint = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, widthCss, heightCss);

      const painted = paintedRef.current;
      const showPaint = contentMode === "paint" || contentMode === "both";
      const showMarquee =
        contentMode === "marquee" || contentMode === "both";

      const lit = new Uint8Array(cols * rows);

      if (showPaint) {
        for (let i = 0; i < lit.length; i++) {
          if (painted[i]) lit[i] = 1;
        }
      }

      if (showMarquee) {
        const normalized =
          ((cursorOffset % bitmapWidth) + bitmapWidth) % bitmapWidth;
        const firstStart = normalized - bitmapWidth;
        const rowOffset = Math.max(
          0,
          Math.floor((rows - FONT_HEIGHT) / 2),
        );

        for (
          let base = firstStart;
          base < cols + bitmapWidth;
          base += bitmapWidth
        ) {
          let cursor = base;
          for (const ch of glyphs) {
            for (let y = 0; y < FONT_HEIGHT; y++) {
              const rowBits = ch.data[y] ?? 0;
              const row = rowOffset + y;
              if (row < 0 || row >= rows) continue;
              for (let x = 0; x < ch.width; x++) {
                const on = (rowBits >> (ch.width - 1 - x)) & 1;
                if (!on) continue;
                const col = Math.floor(cursor + x);
                if (col >= 0 && col < cols) {
                  lit[row * cols + col] = 1;
                }
              }
            }
            cursor += ch.width + charSpacing;
          }
        }
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const on = lit[r * cols + c] === 1;
          drawCell(c, r, on ? active : inactive, on);
        }
      }
    };

    const tick = (ts: number) => {
      if (lastTs === null) lastTs = ts;
      let delta = ts - lastTs;
      lastTs = ts;
      if (delta > 100) delta = 100;

      const animate =
        !reducedMotion &&
        (contentMode === "marquee" || contentMode === "both");

      if (animate) {
        accMs += delta;
        while (accMs >= frameMs) {
          accMs -= frameMs;
          cursorOffset += marqueeSpeed;
        }
      }

      paint();
      raf = window.requestAnimationFrame(tick);
    };

    syncCanvasSize();
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [
    cols,
    rows,
    cellSize,
    cellPaddingRatio,
    background,
    inactive,
    active,
    glow,
    glowBlur,
    glowHighlight,
    contentMode,
    marqueeText,
    marqueeSpeed,
    fps,
    charSpacing,
  ]);

  const applyPaintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !onPaintChangeRef.current) return;
    const hit = cellFromPointer(
      canvas,
      clientX,
      clientY,
      config.cols,
      config.rows,
      config.cellSize,
    );
    if (!hit) return;
    if (lastPaintedIndexRef.current === hit.index) return;
    lastPaintedIndexRef.current = hit.index;

    const next = paintedRef.current.slice();
    if (next.length !== config.cols * config.rows) {
      next.length = config.cols * config.rows;
      for (let i = 0; i < next.length; i++) {
        next[i] = next[i] ?? false;
      }
    }

    const mode = paintModeRef.current;
    if (mode === "paint") next[hit.index] = true;
    else if (mode === "erase") next[hit.index] = false;
    else next[hit.index] = !next[hit.index];

    paintedRef.current = next;
    onPaintChangeRef.current(next);
  };

  return (
    <div
      ref={shellRef}
      role="img"
      aria-label={label?.trim() || "digital screen"}
      className={cn(
        "relative overflow-hidden",
        config.showStroke && "mind-card-shell",
        className,
      )}
      style={{
        background: config.frameBg,
        padding: config.framePadding,
        borderRadius: config.frameRadius,
      }}
      onPointerMove={
        config.showStroke
          ? (e) => {
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
            }
          : undefined
      }
      onPointerLeave={
        config.showStroke
          ? (e) => {
              clearShellStroke(e.currentTarget);
            }
          : undefined
      }
    >
      {config.showStroke ? (
        <span className="mind-card-stroke" aria-hidden />
      ) : null}
      <canvas
        ref={canvasRef}
        className={cn(
          "relative z-[1] block touch-none",
          interactive ? "cursor-crosshair" : "pointer-events-none",
        )}
        aria-hidden
        onPointerDown={
          interactive
            ? (e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drawingRef.current = true;
                lastPaintedIndexRef.current = null;
                const hit = cellFromPointer(
                  e.currentTarget,
                  e.clientX,
                  e.clientY,
                  config.cols,
                  config.rows,
                  config.cellSize,
                );
                if (paintModeRef.current === "toggle" && hit) {
                  paintValueRef.current = !paintedRef.current[hit.index];
                } else {
                  paintValueRef.current = paintModeRef.current !== "erase";
                }
                applyPaintAt(e.clientX, e.clientY);
              }
            : undefined
        }
        onPointerMove={
          interactive
            ? (e) => {
                if (!drawingRef.current) return;
                if (paintModeRef.current === "toggle") {
                  // Continuous stroke uses sticky on/off from first cell.
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const hit = cellFromPointer(
                    canvas,
                    e.clientX,
                    e.clientY,
                    config.cols,
                    config.rows,
                    config.cellSize,
                  );
                  if (!hit || lastPaintedIndexRef.current === hit.index) return;
                  lastPaintedIndexRef.current = hit.index;
                  const next = paintedRef.current.slice();
                  next[hit.index] = paintValueRef.current;
                  paintedRef.current = next;
                  onPaintChangeRef.current?.(next);
                  return;
                }
                applyPaintAt(e.clientX, e.clientY);
              }
            : undefined
        }
        onPointerUp={
          interactive
            ? () => {
                drawingRef.current = false;
                lastPaintedIndexRef.current = null;
              }
            : undefined
        }
        onPointerCancel={
          interactive
            ? () => {
                drawingRef.current = false;
                lastPaintedIndexRef.current = null;
              }
            : undefined
        }
      />
    </div>
  );
}
