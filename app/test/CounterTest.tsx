"use client";

import { useState } from "react";
import {
  HeroCounterStyleProvider,
  type HeroCounterStyle,
} from "@/components/vault/hero-counter-style";

const OPTIONS: { value: HeroCounterStyle; label: string }[] = [
  { value: "tiles", label: "Split tiles" },
  { value: "watermark", label: "Watermark" },
  { value: "odometer", label: "Current" },
];

/** Wraps the real library and floats a small switch for the hero counter. */
export function CounterTest({ children }: { children: React.ReactNode }) {
  const [style, setStyle] = useState<HeroCounterStyle>("tiles");

  return (
    <HeroCounterStyleProvider value={style}>
      {children}
      <div
        role="radiogroup"
        aria-label="Hero counter"
        className="fixed top-3 right-3 z-[60] flex items-center gap-0.5 rounded-full border border-white/15 bg-black/70 p-1 backdrop-blur-md"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={style === option.value}
            onClick={() => setStyle(option.value)}
            className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors ${
              style === option.value
                ? "bg-white text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </HeroCounterStyleProvider>
  );
}
