"use client";

import { useEffect, useState } from "react";
import { Dithering } from "@paper-design/shaders-react";

/**
 * Idle dither field from enesgules.com dither-lab
 * (FROM Idle → TO Idle, Clean / crossfade).
 * Tuned for memory404's dark background.
 */
export default function AuthDitherBackground() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <Dithering
        colorBack="#0c0c0c"
        colorFront="#a8afb8"
        shape="simplex"
        type="8x8"
        size={1.65}
        scale={0.92}
        speed={reduceMotion ? 0 : 0.46}
        rotation={-10}
        offsetX={0.14}
        offsetY={-0.24}
        fit="cover"
        style={{ width: "100%", height: "100%" }}
      />
      {/* Soft scrim so form text stays readable over the field */}
      <div className="absolute inset-0 bg-background/55" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_72%)] opacity-80" />
    </div>
  );
}
