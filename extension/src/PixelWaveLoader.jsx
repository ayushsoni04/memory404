import React, { useMemo } from "react";

const PIXEL_COUNT = 100;
const COLS = 50;

/** Teal pixel-wave loader matching the app AppLoader. */
export function PixelWaveLoader({ width = 96, label = "Loading" }) {
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
      role="img"
      aria-label={label}
      style={{ "--pl-w": `${width}px`, "--pl-cols": COLS }}
    >
      <div className="pixel-loader__pixels">{pixels}</div>
    </div>
  );
}
