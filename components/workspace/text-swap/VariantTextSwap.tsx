"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type TextSwapVariant = "remount" | "from-below" | "tilt-crossfade";

type Props = {
  text: string;
  variant: TextSwapVariant;
  /** Bumps when the lab forces a re-run of the same string */
  tick?: number;
  className?: string;
};

/**
 * Lab preview swaps:
 * - remount: CSS keyframe enter (vault default)
 * - from-below: exit up + enter from below with blur; CSS transitions interpolate frames
 * - tilt-crossfade: 3D tilt stage, text change uses crossfade (no flip of glyphs)
 */
export function VariantTextSwap({
  text,
  variant,
  tick = 0,
  className = "",
}: Props) {
  if (variant === "remount") {
    return (
      <span key={`${text}-${tick}`} className={`t-text-swap t-text-swap-enter ${className}`}>
        {text || "∅"}
      </span>
    );
  }

  if (variant === "tilt-crossfade") {
    return (
      <TiltCrossfade text={text} tick={tick} className={className} />
    );
  }

  return <FromBelowSwap text={text} tick={tick} className={className} />;
}

function parseDurMs(el: HTMLElement | null): number {
  if (!el) return 220;
  const raw = getComputedStyle(el).getPropertyValue("--text-swap-dur").trim();
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 220;
  return raw.endsWith("s") && !raw.endsWith("ms") ? n * 1000 : n;
}

/** Exit up → enter from below with blur; browser interpolates transform/filter/opacity. */
function FromBelowSwap({
  text,
  tick,
  className,
}: {
  text: string;
  tick: number;
  className: string;
}) {
  const elRef = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(text);
  const displayRef = useRef(text);
  const genRef = useRef(0);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useLayoutEffect(() => {
    if (text === displayRef.current && tick === 0) return;

    const el = elRef.current;
    if (!el) {
      setDisplay(text);
      return;
    }

    const gen = ++genRef.current;
    const dur = parseDurMs(el);

    // Phase 1: exit up + blur (interpolated)
    el.classList.remove("is-enter-start");
    el.classList.add("is-exit");

    const t1 = window.setTimeout(() => {
      if (gen !== genRef.current) return;
      // Phase 2: jump to below without transition
      setDisplay(text);
      el.classList.add("is-enter-start");
      el.classList.remove("is-exit");
      // Force reflow so the next frame interpolates from enter-start → rest
      void el.offsetHeight;
      requestAnimationFrame(() => {
        if (gen !== genRef.current) return;
        // Phase 3: interpolate up into place
        el.classList.remove("is-enter-start");
      });
    }, dur);

    return () => {
      window.clearTimeout(t1);
    };
    // tick intentionally included so re-running the same string restarts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, tick]);

  return (
    <span
      ref={elRef}
      className={`t-text-swap t-text-swap-interp ${className}`}
    >
      {display || "∅"}
    </span>
  );
}

/** Slight 3D tilt on the stage; text change is a crossfade (not a flip). */
function TiltCrossfade({
  text,
  tick,
  className,
}: {
  text: string;
  tick: number;
  className: string;
}) {
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [incoming, setIncoming] = useState(text);
  const [phase, setPhase] = useState<"idle" | "crossfade">("idle");
  const prevRef = useRef(text);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    if (text === prevRef.current && tick === 0) return;
    const prev = prevRef.current;
    prevRef.current = text;
    setOutgoing(prev);
    setIncoming(text);
    setPhase("crossfade");

    const dur = parseDurMs(wrapRef.current);
    const t = window.setTimeout(() => {
      setOutgoing(null);
      setPhase("idle");
    }, dur + 20);
    return () => window.clearTimeout(t);
  }, [text, tick]);

  return (
    <span
      ref={wrapRef}
      className={`t-text-swap-tilt ${phase === "crossfade" ? "is-tilting" : ""} ${className}`}
    >
      <span className="t-text-swap-tilt-stage">
        {outgoing != null ? (
          <span className="t-text-swap-layer is-out" aria-hidden>
            {outgoing || "∅"}
          </span>
        ) : null}
        <span
          className={`t-text-swap-layer is-in ${
            phase === "crossfade" ? "is-fading-in" : ""
          }`}
        >
          {incoming || "∅"}
        </span>
      </span>
    </span>
  );
}
