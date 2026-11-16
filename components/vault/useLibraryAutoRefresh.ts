"use client";

import { useEffect, useRef } from "react";
import { isTextEntryTarget } from "./feed-keyboard";

/** How often the library reloads itself while the tab is in view. */
export const LIBRARY_REFRESH_MS = 60_000;

type Options = {
  loadGroups: () => Promise<unknown>;
  loadLinks: () => Promise<unknown>;
  /** Hold off while something is open or in flight (a dialog, a drag, a save). */
  paused?: boolean;
  intervalMs?: number;
};

/**
 * Keeps the library current without a Refresh button. Reloads groups and
 * links on a timer, and straight away when the tab comes back into view or
 * the connection returns after a gap longer than the timer.
 *
 * It stays out of the way: no reload while the tab is hidden, the device is
 * offline, a refresh is already running, the caller says `paused`, or the
 * user is typing in a field.
 */
export function useLibraryAutoRefresh({
  loadGroups,
  loadLinks,
  paused = false,
  intervalMs = LIBRARY_REFRESH_MS,
}: Options) {
  const latest = useRef({ loadGroups, loadLinks, paused });
  useEffect(() => {
    latest.current = { loadGroups, loadLinks, paused };
  });

  useEffect(() => {
    if (intervalMs <= 0) return;
    let running = false;
    let lastRun = Date.now();

    const refresh = () => {
      if (running || latest.current.paused) return;
      if (document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      if (isTextEntryTarget(document.activeElement)) return;
      running = true;
      lastRun = Date.now();
      // A failed reload already shows its own message in the feed.
      void Promise.allSettled([
        latest.current.loadGroups(),
        latest.current.loadLinks(),
      ]).finally(() => {
        running = false;
      });
    };

    /** Coming back after a while away: catch up now instead of waiting a full turn. */
    const catchUp = () => {
      if (Date.now() - lastRun >= intervalMs) refresh();
    };

    const timer = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("online", catchUp);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("online", catchUp);
    };
  }, [intervalMs]);
}
