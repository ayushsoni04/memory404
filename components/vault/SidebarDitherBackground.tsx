"use client";

import { useEffect, useState } from "react";
import { Dithering } from "@paper-design/shaders-react";

/**
 * DKT → DKT field from https://enesgules.com/dither-lab (dark theme).
 * Warm wave dither for the vault sidebar panel.
 */
export default function SidebarDitherBackground() {
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
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      aria-hidden
    >
      <Dithering
        colorBack="#0c0c0c"
        colorFront="#a8afb8"
        shape="wave"
        type="8x8"
        size={1.75}
        scale={0.84}
        speed={reduceMotion ? 0 : 0.82}
        rotation={-8}
        offsetX={-0.3}
        offsetY={0.36}
        fit="cover"
        style={{ width: "100%", height: "100%" }}
      />
      {/* Keep sidebar controls readable over the grain */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,#000_78%)] opacity-70" />
    </div>
  );
}
