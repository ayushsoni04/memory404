/**
 * Starred links, kept in this browser only (localStorage) until favourites
 * exist on the server.
 */
const KEY = "m404-starred";
const EVENT = "memory404:starred";

let cache: Set<string> | null = null;
let snapshot = "";

function read(): Set<string> {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    cache = new Set();
  }
  snapshot = [...cache].join(",");
  return cache;
}

export function isStarred(id: string): boolean {
  if (typeof window === "undefined") return false;
  return read().has(id);
}

export function toggleStarred(id: string): boolean {
  const set = read();
  const on = !set.has(id);
  if (on) set.add(id);
  else set.delete(id);
  snapshot = [...set].join(",");
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* private mode: keeps for this visit */
  }
  window.dispatchEvent(new Event(EVENT));
  return on;
}

/** For useSyncExternalStore: changes whenever the starred set changes. */
export function starredSnapshot(): string {
  if (typeof window === "undefined") return "";
  read();
  return snapshot;
}

export function subscribeStarred(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
