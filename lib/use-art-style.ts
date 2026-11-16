"use client";

import { useSyncExternalStore } from "react";
import {
  currentArtStyle,
  subscribeArtStyle,
  type ArtStyle,
} from "./art-style";

const serverArtStyle = (): ArtStyle => "signal";

/** The live art style. Renders "signal" on the server, then syncs a saved mono tone. */
export function useArtStyle(): ArtStyle {
  return useSyncExternalStore(subscribeArtStyle, currentArtStyle, serverArtStyle);
}
