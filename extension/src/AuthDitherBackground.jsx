import React, { useEffect, useState } from "react";
import { Dithering } from "@paper-design/shaders-react";

/**
 * Same idle dither field as the website login shell
 * (enesgules.com dither-lab Idle → Idle), scoped to the extension panel.
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
    <div className="auth-dither" aria-hidden="true">
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
      <div className="auth-dither-scrim" />
      <div className="auth-dither-vignette" />
    </div>
  );
}
