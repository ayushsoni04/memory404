"use client";

import { useInView, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { RetroDither } from "@/components/canvasui/RetroDither";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Retro CRT dither over feed card images (viewport-gated to limit WebGL contexts). */
export default function DitheredPreview({ children, className }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(rootRef, { margin: "80px 0px", amount: 0.1 });
  const reduceMotion = useReducedMotion();
  const shellClass = className ?? "absolute inset-0";

  if (reduceMotion || !inView) {
    return (
      <div ref={rootRef} className={shellClass}>
        {children}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={shellClass}>
      <RetroDither
        className="h-full w-full"
        radius={0.55}
        softness={0.9}
        pixelSize={2}
        levels={4}
        darkColor={[0.02, 0.02, 0.02]}
        lightColor={[0.92, 0.92, 0.9]}
        colorize={0.12}
        contrast={0.7}
        brightness={0.02}
        strength={0.88}
        baseStrength={0.35}
        invert={0}
        scanlines={0.16}
        pattern="bayer"
        trail={0.4}
        degauss={0.75}
        followSpeed={3.25}
      >
        <div className="relative h-full w-full">{children}</div>
      </RetroDither>
    </div>
  );
}
