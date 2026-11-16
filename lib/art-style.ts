/**
 * The app's look is Signal: the grainy eclipse-poster style with a sky haze,
 * film grain, wide-tracked mono labels and big tight statement type. It is
 * always on: the root layout renders <html data-art="signal">.
 *
 * "mono" is Signal with every colour drained to greys. It adds
 * data-tone="mono", which only swaps the colours.
 */
export const ART_STYLE_KEY = "memory404-art-style";
export const ART_STYLES = ["signal", "mono"] as const;
export type ArtStyle = (typeof ART_STYLES)[number];

const ART_STYLE_EVENT = "memory404:art-style";

/** Anything that isn't "mono" is Signal, including values saved by older builds. */
export function parseArtStyle(raw: unknown): ArtStyle {
  return raw === "mono" ? "mono" : "signal";
}

export function readStoredArtStyle(): ArtStyle {
  if (typeof window === "undefined") return "signal";
  try {
    return parseArtStyle(window.localStorage.getItem(ART_STYLE_KEY));
  } catch {
    return "signal";
  }
}

/** The style the page is showing right now. */
export function currentArtStyle(): ArtStyle {
  if (typeof document === "undefined") return "signal";
  return document.documentElement.dataset.tone === "mono" ? "mono" : "signal";
}

function paintArtStyle(style: ArtStyle) {
  const root = document.documentElement;
  root.dataset.art = "signal";
  if (style === "mono") root.dataset.tone = "mono";
  else delete root.dataset.tone;
}

/** Switch the style, remember it, and tell every mounted listener. */
export function applyArtStyle(style: ArtStyle): void {
  if (typeof document === "undefined") return;
  paintArtStyle(style);
  try {
    if (style === "signal") window.localStorage.removeItem(ART_STYLE_KEY);
    else window.localStorage.setItem(ART_STYLE_KEY, style);
  } catch {
    /* private mode: the style still applies for this visit */
  }
  window.dispatchEvent(new Event(ART_STYLE_EVENT));
}

/** For useSyncExternalStore. Also follows a change made in another tab. */
export function subscribeArtStyle(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== ART_STYLE_KEY) return;
    paintArtStyle(readStoredArtStyle());
    onChange();
  };
  window.addEventListener(ART_STYLE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ART_STYLE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Runs in <head> before first paint so a saved mono tone never flashes in. */
export const ART_STYLE_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  ART_STYLE_KEY,
)})==="mono")document.documentElement.dataset.tone="mono"}catch(e){}})()`;
