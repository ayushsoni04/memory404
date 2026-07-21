"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Vault title swap — old text exits up, new text enters from below with blur.
 * CSS transitions interpolate transform / filter / opacity between frames.
 */
export default function TextSwap({ children }: { children: string }) {
  const text = children;
  const elRef = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(text);
  const displayRef = useRef(text);
  const genRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useLayoutEffect(() => {
    // First paint: show text at rest (no entrance on initial mount).
    if (!mountedRef.current) {
      mountedRef.current = true;
      displayRef.current = text;
      setDisplay(text);
      return;
    }

    if (text === displayRef.current) return;

    const el = elRef.current;
    if (!el) {
      setDisplay(text);
      return;
    }

    const gen = ++genRef.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setDisplay(text);
      el.classList.remove("is-exit", "is-enter-start");
      return;
    }

    const raw = getComputedStyle(el).getPropertyValue("--text-swap-dur").trim();
    const n = Number.parseFloat(raw);
    const dur = Number.isFinite(n)
      ? raw.endsWith("s") && !raw.endsWith("ms")
        ? n * 1000
        : n
      : 150;

    // Phase 1: exit up + blur (interpolated)
    el.classList.remove("is-enter-start");
    el.classList.add("is-exit");

    const t1 = window.setTimeout(() => {
      if (gen !== genRef.current) return;
      // Phase 2: jump to below without transition
      setDisplay(text);
      el.classList.add("is-enter-start");
      el.classList.remove("is-exit");
      void el.offsetHeight;
      requestAnimationFrame(() => {
        if (gen !== genRef.current) return;
        // Phase 3: interpolate up into place from below
        el.classList.remove("is-enter-start");
      });
    }, dur);

    return () => {
      window.clearTimeout(t1);
    };
  }, [text]);

  return (
    <span ref={elRef} className="t-text-swap t-text-swap-interp">
      {display}
    </span>
  );
}
