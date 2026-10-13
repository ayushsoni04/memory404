import { bind, play as cuelumePlay, setEnabled, type SoundName } from "cuelume";

export const SOUND_PREF_KEY = "m404-sounds-enabled";

let unlocked = false;
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

  if (!unlocked) {
    const unlock = () => {
      unlocked = true;
      // Must create/resume Cuelume's shared AudioContext during a real gesture.
      // `press` is a dull muted knock — only fires once on first interaction.
      cuelumePlay("press");
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, {
      capture: true,
      passive: true,
    });
    window.addEventListener("keydown", unlock, {
      capture: true,
      passive: true,
    });
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

/** Imperative cue — safe after `bootUiSounds()` has unlocked the context. */
export function playUiSound(name: SoundName): void {
  cuelumePlay(name);
}
