"use client";

import { useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
};

// Minimal cubic-bezier(x1,y1,x2,y2) sampler
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const dx = ((ax * s + bx) * s + cx) * s - t;
      const d = (3 * ax * s + 2 * bx) * s + cx;
      if (Math.abs(dx) < 1e-6 || d === 0) break;
      s -= dx / d;
    }
    return ((ay * s + by) * s + cy) * s;
  };
}

const easeOut = bezier(0.22, 1, 0.36, 1);

export default function ClearSearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
}: Props) {
  const [clearing, setClearing] = useState(false);
  const [mirrorText, setMirrorText] = useState("");
  
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const pholdRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderedMirrorText = clearing
    ? mirrorText
    : value.replace(/ /g, "\u00a0");

  const buildGlow = (text: string) => {
    if (!inputRef.current || !rootRef.current) return "";
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.font = getComputedStyle(inputRef.current).font;
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const rgb = isDark ? "255,255,255" : "0,0,0";
    const w = rootRef.current.clientWidth || 112; // default w-28 is 112px
    const padLeft = 10; // matching paddingLeft below
    const spread = 1.5;
    const layers: string[] = [];
    let x = 0;
    
    text.split(/(\s+)/).forEach((seg) => {
      const segW = ctx.measureText(seg).width;
      if (seg.trim()) {
        const cx = padLeft + x + segW / 2;
        const hw = Math.max(segW * 0.45, 8) * spread;
        [
          [0, 0.8, 7, 0.22],
          [hw * 0.45, 0.55, 8, 0.18],
          [-hw * 0.4, 0.65, 6, 0.16],
          [hw * 0.15, 0.9, 5, 0.14]
        ].forEach(([dx, rwm, rh, a]) => {
          const lx = (((cx + dx) / w) * 100).toFixed(2);
          layers.push(
            `radial-gradient(ellipse ${Math.max(hw * rwm, 2).toFixed(1)}px ${rh}px at ${lx}% 100%, rgba(${rgb},${a}), transparent)`
          );
        });
      }
      x += segW;
    });
    return layers.join(", ");
  };

  const handleClear = () => {
    if (clearing || !value) return;
    const keepFocus = document.activeElement === inputRef.current;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onChange("");
      setMirrorText("");
      if (keepFocus) {
        requestAnimationFrame(() =>
          inputRef.current?.focus({ preventScroll: true }),
        );
      }
      return;
    }

    setClearing(true);
    
    const mirror = mirrorRef.current;
    const phold = pholdRef.current;
    const glow = glowRef.current;
    const input = inputRef.current;

    if (!mirror || !phold || !glow || !input) {
      onChange("");
      setClearing(false);
      return;
    }

    const currentText = value.replace(/ /g, "\u00a0");
    setMirrorText(currentText);

    const total = 220;
    const outDur = 160;
    const inDur = 160;
    const outFly = 6;
    const inFly = 6;
    const blur = 2;
    const delay = 50;
    const peakAt = 0.15;
    const gOp = 0.85;

    onChange("");
    glow.style.background = buildGlow(currentText);
    glow.style.opacity = "0";
    phold.style.transform = `translateY(-${inFly}px)`;
    phold.style.opacity = "0.9";
    phold.style.filter = `blur(${blur}px)`;

    const t0 = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const el = now - t0;
      
      const eo = easeOut(Math.min(1, el / outDur));
      mirror.style.transform = `translateY(${(eo * outFly).toFixed(1)}px)`;
      mirror.style.opacity = (1 - eo).toFixed(3);
      mirror.style.filter = `blur(${(eo * blur).toFixed(1)}px)`;

      const ei = easeOut(Math.min(1, el / inDur));
      phold.style.transform = `translateY(${(-inFly + ei * inFly).toFixed(1)}px)`;
      phold.style.opacity = (0.9 + ei * 0.1).toFixed(3);
      phold.style.filter = `blur(${(blur - ei * blur).toFixed(1)}px)`;

      let g = 0;
      if (el > delay) {
        const gp = Math.min(1, (el - delay) / Math.max(1, total - delay));
        g = gp < peakAt ? gp / peakAt : 1 - (gp - peakAt) / (1 - peakAt);
      }
      glow.style.opacity = (g * gOp).toFixed(3);

      if (el < total) {
        rafId = requestAnimationFrame(tick);
      } else {
        setClearing(false);
        mirror.style.cssText = "";
        phold.style.cssText = "";
        setMirrorText("");
        glow.style.opacity = "0";
        glow.style.background = "";
        if (keepFocus) {
          requestAnimationFrame(() => input.focus({ preventScroll: true }));
        }
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  };

  const hasValue = value.length > 0;

  return (
    <div
      ref={rootRef}
      className={`t-clear ${hasValue ? "has-value" : ""} ${
        clearing ? "is-clearing" : ""
      } ${className || ""}`}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => !clearing && onChange(e.target.value)}
        placeholder=""
        className="w-full h-full bg-transparent border-none outline-none text-[13px] text-foreground font-sans"
        style={{ paddingLeft: "10px", paddingRight: "26px" }}
      />
      <div
        ref={mirrorRef}
        className="t-clear-mirror text-[13px] font-sans"
        style={{ paddingLeft: "10px", paddingRight: "26px" }}
        aria-hidden="true"
      >
        {renderedMirrorText}
      </div>
      <div
        ref={pholdRef}
        className="t-clear-placeholder text-[13px] font-sans text-subtle"
        style={{ paddingLeft: "10px", paddingRight: "26px" }}
        aria-hidden="true"
      >
        {placeholder}
      </div>
      <div ref={glowRef} className="t-clear-glow" aria-hidden="true"></div>
      
      {hasValue || clearing ? (
        <button
          type="button"
          onClick={handleClear}
          onMouseDown={(e) => {
            if (document.activeElement === inputRef.current) {
              e.preventDefault();
            }
          }}
          className="t-clear-btn absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex size-4 items-center justify-center rounded-full bg-pill hover:bg-pill-hover text-muted hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <svg
            className="size-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
