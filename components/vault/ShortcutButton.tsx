"use client";

import { openShortcutHelp } from "./ShortcutHelp";

/** A visible way into the shortcut list. The ? key still opens it. */
export function ShortcutButton() {
  return (
    <button
      type="button"
      onClick={() => openShortcutHelp()}
      aria-label="Keyboard shortcuts"
      className="inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-[13px] text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-8"
    >
      <span aria-hidden>Shortcuts</span>
      <kbd
        aria-hidden
        className="rounded-md border border-border bg-pill px-1.5 py-0.5 font-mono text-[11px] text-subtle"
      >
        ?
      </kbd>
    </button>
  );
}
