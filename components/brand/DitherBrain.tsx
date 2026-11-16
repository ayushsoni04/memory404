"use client";

import { useEffect, useRef } from "react";
import "./brand-fonts.css";

/** 4×4 Bayer thresholds, 0–1. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Palette the dither samples from: white to soft grey. */
const STOPS: [number, number, number][] = [
  [250, 250, 250],
  [214, 216, 222],
  [244, 244, 246],
  [200, 202, 208],
  [250, 250, 250],
];

function mix(t: number): [number, number, number] {
  const x = ((t % 1) + 1) % 1;
  const seg = x * (STOPS.length - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

type Props = {
  /** CSS pixels. */
  size?: number;
  /** CSS pixels per dither cell. */
  cell?: number;
  className?: string;
};

/**
 * The brain mark as an ordered dither: a slowly drifting colour field, shaded
 * by the brain illustration and clipped to its outline.
 */
export function DitherBrain({ size = 56, cell = 2, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const n = Math.max(8, Math.round(size / cell));
    const px = canvas.width / n;

    // Sample the brain once into an n×n grid of { alpha, darkness }.
    let alpha = new Float32Array(0);
    let dark = new Float32Array(0);
    const img = new Image();
    img.src = "/brand-brain.png";

    let raf = 0;
    let last = 0;
    let running = true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = time / 9000;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const i = y * n + x;
          const a = alpha[i];
          if (a < 0.5) continue;
          // The outline never moves; only the light inside it does. A soft
          // highlight orbits the brain and a slow swirl ripples the dots, so the
          // dither pattern drifts around like a lit sphere.
          const u = x / n - 0.5;
          const v = y / n - 0.5;
          const lx = Math.cos(time / 1500) * 0.26;
          const ly = Math.sin(time / 1900) * 0.2 - 0.04;
          const d2 = (u - lx) ** 2 + (v - ly) ** 2;
          const spot = Math.exp(-d2 / 0.05) * 0.9;
          const swirl =
            Math.sin(u * 9 + time / 900) * Math.cos(v * 7 - time / 1100) * 0.12;
          const light = 0.3 + (1 - dark[i]) * 0.4 + spot + swirl;
          const on = light > BAYER[(y % 4) * 4 + (x % 4)];
          const [r, g, b] = mix(t + (x + y) / (n * 2.4));
          ctx.fillStyle = on
            ? `rgb(${r | 0} ${g | 0} ${b | 0})`
            : `rgb(${(r * 0.26) | 0} ${(g * 0.26) | 0} ${(b * 0.27) | 0})`;
          ctx.fillRect(x * px, y * px, px - 0.6 * dpr, px - 0.6 * dpr);
        }
      }
    };

    const loop = (time: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (time - last < 50 || document.hidden) return; // ~20fps is plenty
      last = time;
      draw(time);
    };

    img.onload = () => {
      const s = document.createElement("canvas");
      s.width = n;
      s.height = n;
      const sc = s.getContext("2d", { willReadFrequently: true });
      if (!sc) return;
      sc.drawImage(img, 0, 0, n, n);
      const data = sc.getImageData(0, 0, n, n).data;
      alpha = new Float32Array(n * n);
      dark = new Float32Array(n * n);
      for (let i = 0; i < n * n; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        // The sticker's white border is opaque; treat near-white as outside.
        alpha[i] = lum > 0.93 ? 0 : data[i * 4 + 3] / 255;
        dark[i] = 1 - lum;
      }
      if (reduce) draw(0);
      else raf = requestAnimationFrame(loop);
    };

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      img.onload = null;
    };
  }, [size, cell]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`block ${className}`}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}
