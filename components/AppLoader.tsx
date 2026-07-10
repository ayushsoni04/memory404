"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import "@/components/pixel-loader.css";

const PIXEL_COUNT = 100;
const COLS = 50;

const PROGRESSIVE_MESSAGES = [
  { afterMs: 0, text: "Saving…" },
  { afterMs: 2500, text: "Still working…" },
  { afterMs: 5500, text: "Almost there…" },
  { afterMs: 10000, text: "Taking a bit longer…" },
  { afterMs: 16000, text: "Hang tight…" },
] as const;

type AppLoaderProps = {
  /** Overall width of the pixel strip in px (height follows). */
  size?: number;
  label?: string;
  className?: string;
  /** Compact chip for buttons / inline rows (less padding). */
  compact?: boolean;
  /**
   * Cycle through progressive status copy based on elapsed time.
   * When true, `label` is used as the initial message (default "Saving…").
   */
  progressive?: boolean;
};

function useProgressiveMessage(enabled: boolean, initial?: string) {
  const [message, setMessage] = useState(
    initial?.trim() || PROGRESSIVE_MESSAGES[0].text,
  );

  useEffect(() => {
    if (!enabled) {
      setMessage(initial?.trim() || PROGRESSIVE_MESSAGES[0].text);
      return;
    }

    const started = Date.now();
    setMessage(initial?.trim() || PROGRESSIVE_MESSAGES[0].text);

    const tick = () => {
      const elapsed = Date.now() - started;
      let next = initial?.trim() || PROGRESSIVE_MESSAGES[0].text;
      for (const step of PROGRESSIVE_MESSAGES) {
        if (elapsed >= step.afterMs) {
          next =
            step.afterMs === 0 && initial?.trim()
              ? initial.trim()
              : step.text;
        }
      }
      setMessage(next);
    };

    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, [enabled, initial]);

  return message;
}

function PixelWave({ width }: { width: number }) {
  const pixels = useMemo(
    () =>
      Array.from({ length: PIXEL_COUNT }, (_, i) => {
        const col = i % COLS;
        return (
          <span
            key={i}
            className="pixel-loader__pixel"
            style={{ animationDelay: `${col * 0.02}s` }}
          />
        );
      }),
    [],
  );

  return (
    <div
      className="pixel-loader"
      style={
        {
          "--pl-w": `${width}px`,
          "--pl-cols": COLS,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className="pixel-loader__pixels">{pixels}</div>
    </div>
  );
}

export function AppLoader({
  size = 96,
  label,
  className,
  compact = false,
  progressive = false,
}: AppLoaderProps) {
  const message = useProgressiveMessage(progressive, label);
  const showLabel = Boolean(label) || progressive;
  const aria = showLabel ? message : "Loading";
  const width = Math.max(compact ? 56 : 72, size);

  return (
    <div
      role="status"
      aria-label={aria}
      aria-live="polite"
      className={cn(
        "inline-flex flex-row items-center gap-3 bg-[#121212]",
        compact ? "rounded-lg px-2 py-1.5" : "rounded-xl px-3.5 py-2.5",
        className,
      )}
    >
      <PixelWave width={width} />
      {showLabel ? (
        <span
          className="text-sm font-medium tracking-wide text-[#caf7e2]"
          style={{
            fontFamily:
              "Century Gothic, CenturyGothic, AppleGothic, sans-serif",
          }}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
