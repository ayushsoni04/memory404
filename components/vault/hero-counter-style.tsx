"use client";

import { createContext, useContext } from "react";

/** Which link counter the feed hero shows. Only /test changes it; the home page keeps the odometer. */
export type HeroCounterStyle = "odometer" | "tiles" | "watermark";

const HeroCounterStyleContext = createContext<HeroCounterStyle>("odometer");

export const HeroCounterStyleProvider = HeroCounterStyleContext.Provider;

export function useHeroCounterStyle(): HeroCounterStyle {
  return useContext(HeroCounterStyleContext);
}
