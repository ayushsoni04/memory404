import { GRID_SIZE_KEY, type GridSize } from "./types";

/**
 * Debounced localStorage writer — batches rapid writes into one, avoiding
 * synchronous JSON.stringify on every SWR page load / link update.
 */
export function makeDebouncedLocalStorageWriter(key: string, delayMs = 60) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (value: unknown) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }, delayMs);
  };
}

export const writeLinksCacheToStorage = makeDebouncedLocalStorageWriter(
  "memory404-links-cache",
  60,
);

export function readStoredGridSize(): GridSize {
  if (typeof window === "undefined") return "large";
  try {
    const raw = window.localStorage.getItem(GRID_SIZE_KEY);
    if (raw === "compact" || raw === "default" || raw === "large") return raw;
  } catch {
    /* ignore */
  }
  return "large";
}

export function readStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readJsonStorage<T>(key: string, fallback: T): T {
  const raw = readStorageItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
