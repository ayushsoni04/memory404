"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrainMark } from "./BrainMark";
import { TapSparkles } from "./TapSparkles";
import "./brand-fonts.css";

const AWAKE_MS = 2200;

/**
 * The memory404 mark: a slowly turning 3D brain. Hovering slides the
 * "memory404" wordmark out from behind it. Tapping lifts and tilts the brain,
 * shows the wordmark for a moment (touch has no hover) and scatters stars
 * across the top bar.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLAnchorElement>(null);
  const awakeTimer = useRef(0);
  const [pulse, setPulse] = useState(0);
  const [awake, setAwake] = useState(false);
  const [noBrain, setNoBrain] = useState(false);
  const [starHost, setStarHost] = useState<HTMLElement | null>(null);

  useEffect(() => () => window.clearTimeout(awakeTimer.current), []);

  const onTap = () => {
    setStarHost(rootRef.current?.closest<HTMLElement>(".feed-topbar") ?? null);
    setPulse((p) => p + 1);
    setAwake(true);
    window.clearTimeout(awakeTimer.current);
    awakeTimer.current = window.setTimeout(() => setAwake(false), AWAKE_MS);
  };

  return (
    <Link
      ref={rootRef}
      href="/"
      onClick={onTap}
      aria-label="memory404, home"
      data-awake={awake || undefined}
      data-no-brain={noBrain || undefined}
      className={`brand-mark tap ${className}`}
    >
      <span className="brand-brain">
        <BrainMark pulse={pulse} onFail={() => setNoBrain(true)} />
      </span>
      <span className="brand-reveal">
        <span className="brand-word font-pixel">
          memory<span className="brand-word-dim">404</span>
        </span>
      </span>
      {starHost ? createPortal(<TapSparkles burst={pulse} />, starHost) : null}
    </Link>
  );
}
