/**
 * Library layout, saved in localStorage:
 * - "bar": no sidebar; logo and profile live in the feed's top bar.
 * - "sidebar": the left sidebar with the logo, Browse list and dial.
 */
export type LibraryLayout = "bar" | "sidebar";
export const LAYOUT_PREF_KEY = "m404-library-layout";
const LAYOUT_EVENT = "memory404:layout";

export function getLibraryLayout(): LibraryLayout {
  if (typeof window === "undefined") return "bar";
  try {
    return window.localStorage.getItem(LAYOUT_PREF_KEY) === "sidebar" ? "sidebar" : "bar";
  } catch {
    return "bar";
  }
}

export function setLibraryLayout(layout: LibraryLayout): void {
  try {
    window.localStorage.setItem(LAYOUT_PREF_KEY, layout);
  } catch {
    /* private mode: applies for this visit only */
  }
  window.dispatchEvent(new Event(LAYOUT_EVENT));
}

export function subscribeLibraryLayout(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === LAYOUT_PREF_KEY) onChange();
  };
  window.addEventListener(LAYOUT_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LAYOUT_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
