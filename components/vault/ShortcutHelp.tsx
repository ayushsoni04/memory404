"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  SHORTCUT_HELP_EVENT,
  SHORTCUT_ROWS,
  formatShortcutKeys,
  isMacPlatform,
  isShortcutHelpKey,
} from "./shortcut-help";
import { controlPress } from "./types";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function openShortcutHelp() {
  window.dispatchEvent(new Event(SHORTCUT_HELP_EVENT));
}

export default function ShortcutHelp() {
  const mounted = useIsClient();
  const [open, setOpen] = useState(false);
  const mac =
    typeof navigator !== "undefined" && isMacPlatform(navigator.platform);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen((current) => {
          if (!current) return current;
          event.preventDefault();
          return false;
        });
        return;
      }
      if (!isShortcutHelpKey(event)) return;
      event.preventDefault();
      setOpen((current) => !current);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(SHORTCUT_HELP_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(SHORTCUT_HELP_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = document.getElementById("shortcut-help-close");
    close?.focus();
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[280] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-surface-elevated p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="shortcut-help-title" className="text-sm font-medium text-foreground">
              Keyboard shortcuts
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              These work in your library. A text field keeps its own keys.
            </p>
          </div>
          <button
            id="shortcut-help-close"
            type="button"
            onClick={() => setOpen(false)}
            className={`inline-flex h-8 items-center rounded-full bg-pill px-3 text-[13px] font-medium text-foreground ${controlPress}`}
          >
            Close
          </button>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {SHORTCUT_ROWS.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-[13px] text-foreground">{row.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {formatShortcutKeys(row.keys, mac).map((key) => (
                  <kbd
                    key={key}
                    className="rounded-md border border-border bg-pill px-1.5 py-0.5 font-mono text-[11px] text-subtle"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
