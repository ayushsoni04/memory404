"use client";

import { useEffect, useRef, useState } from "react";
import type { NixieMode, NixieTiming } from "@/lib/nixie";
import type { NixieScene } from "./NixieScene";

export type NixieCounterHandle = { replay: (from: number) => void };

type Props = {
  value: number;
  tubes: number;
  mode: NixieMode;
  leadingZeros: boolean;
  glow: number;
  timing: NixieTiming;
  className?: string;
  /** Gets a handle for replaying the change animation. */
  onReady?: (handle: NixieCounterHandle) => void;
};

/** Three.js nixie-tube counter. three loads only in the browser, on demand. */
export function NixieCounter({
  value,
  tubes,
  mode,
  leadingZeros,
  glow,
  timing,
  className = "",
  onReady,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<NixieScene | null>(null);
  const [failed, setFailed] = useState(false);
  const initial = useRef({ value, tubes, mode, leadingZeros, glow, timing, onReady });

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    import("./NixieScene")
      .then(({ NixieScene }) => {
        if (cancelled) return;
        const start = initial.current;
        try {
          const scene = new NixieScene(host, start);
          sceneRef.current = scene;
          start.onReady?.({ replay: (from) => scene.replay(from) });
        } catch (error) {
          console.error("NixieCounter: WebGL unavailable", error);
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setOptions({ tubes, mode, leadingZeros, glow, timing });
  }, [tubes, mode, leadingZeros, glow, timing]);

  useEffect(() => {
    sceneRef.current?.setValue(value);
  }, [value]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={`${value} links`}
      className={`relative overflow-hidden bg-[#0a0a0c] ${className}`}
    >
      {failed ? (
        <p className="absolute inset-0 flex items-center justify-center font-mono text-xs text-subtle">
          WebGL is not available in this browser.
        </p>
      ) : null}
    </div>
  );
}
