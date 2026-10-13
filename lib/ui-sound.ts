import { bind, play as cuelumePlay, setEnabled, type SoundName } from "cuelume";

export const SOUND_PREF_KEY = "m404-sounds-enabled";

let bound = false;

/** Apply stored preference and wire declarative `data-cuelume-*` listeners once. */
export function bootUiSounds(): void {
  if (typeof window === "undefined") return;

  try {
    const stored = window.localStorage.getItem(SOUND_PREF_KEY);
    setEnabled(stored !== "0");
  } catch {
    setEnabled(true);
  }

  if (!bound) {
    bind();
    bound = true;
  }
}

export function getSoundsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSoundsEnabled(enabled: boolean): void {
  setEnabled(enabled);
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore quota */
  }
}

/**
 * Imperative cue. Call synchronously inside a click/pointer handler when
 * possible so the shared AudioContext unlocks during the user gesture —
 * then later cues after `await` can resume cleanly.
 */
export function playUiSound(name: SoundName): void {
  cuelumePlay(name);
}
