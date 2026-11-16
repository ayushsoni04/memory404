/** Custom cursor on/off, saved in localStorage. On by default for mouse users. */
export const CURSOR_PREF_KEY = "m404-custom-cursor";
const CURSOR_EVENT = "memory404:cursor";

export function getCustomCursorEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CURSOR_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setCustomCursorEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(CURSOR_PREF_KEY, enabled ? "1" : "0");
  } catch {
    /* private mode: applies for this visit only */
  }
  window.dispatchEvent(new Event(CURSOR_EVENT));
}

export function subscribeCustomCursor(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CURSOR_PREF_KEY) onChange();
  };
  window.addEventListener(CURSOR_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CURSOR_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
