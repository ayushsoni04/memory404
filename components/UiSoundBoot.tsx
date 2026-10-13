"use client";

import { useEffect } from "react";
import { bootUiSounds } from "@/lib/ui-sound";

/** Mount once in the root layout to unlock Web Audio and bind declarative cues. */
export function UiSoundBoot() {
  useEffect(() => {
    bootUiSounds();
  }, []);
  return null;
}
