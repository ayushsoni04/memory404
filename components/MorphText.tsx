"use client";

import { TextMorph } from "torph/react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  /** Keep UI morphs snappy; torph default is 400ms. */
  duration?: number;
};

/**
 * Character-morphing text for state changes (titles, counts, button labels).
 * Respects prefers-reduced-motion via torph.
 */
export default function MorphText({
  children,
  className,
  as = "span",
  duration = 280,
}: Props) {
  return (
    <TextMorph
      as={as}
      className={cn("inline-block", className)}
      duration={duration}
      scale
      respectReducedMotion
    >
      {children}
    </TextMorph>
  );
}
