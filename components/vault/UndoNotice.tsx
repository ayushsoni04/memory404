"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  isTypingTarget,
  UNDO_MS,
  undoSecondsLeft,
  undoShortcutLabel,
  type UndoNoticeModel,
} from "./undo-offer";
import { controlPress } from "./types";

type Props = {
  notice: UndoNoticeModel | null;
  onUndo: () => void;
  onDismiss: () => void;
};

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function UndoCountdown({ token }: { token: number }) {
  const [seconds, setSeconds] = useState(() => undoSecondsLeft(0));

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      setSeconds(undoSecondsLeft(Date.now() - started));
    }, 250);
    return () => window.clearInterval(id);
  }, [token]);

  return (
    <span className="shrink-0 font-mono text-[11px] tabular-nums text-subtle">
      {seconds}s
    </span>
  );
}

export default function UndoNotice({ notice, onUndo, onDismiss }: Props) {
  const mounted = useIsClient();
  const offer = Boolean(notice && !notice.error && notice.perform);

  useEffect(() => {
    if (!notice || notice.error || notice.busy) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.shiftKey || isTypingTarget(event.target)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        onUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notice, onUndo]);

  const message = notice?.error ?? notice?.message ?? "";
  const body = (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[240] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={
          notice
            ? `pointer-events-auto relative flex max-w-[min(100%,28rem)] items-center gap-3 rounded-full border border-border bg-surface-elevated py-1.5 ps-4 pe-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${offer ? "pb-2.5" : ""}`
            : "sr-only"
        }
      >
        {notice ? (
          <>
            <p className="min-w-0 text-[13px] text-foreground">{message}</p>
            {offer ? (
              <>
                <UndoCountdown token={notice.token} />
                <kbd className="shrink-0 rounded-md border border-border bg-pill px-1.5 py-0.5 font-mono text-[11px] text-subtle">
                  {undoShortcutLabel(
                    typeof navigator === "undefined" ? "" : navigator.platform,
                  )}
                </kbd>
                <span className="sr-only">
                  Press {undoShortcutLabel(navigator.platform)} to undo. Available for 10 seconds.
                </span>
                <span
                  key={notice.token}
                  aria-hidden
                  className="undo-lifetime"
                  style={{ animationDuration: `${UNDO_MS}ms` }}
                />
              </>
            ) : null}
            {notice.error ? (
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex h-8 shrink-0 items-center rounded-full bg-pill px-3 text-[13px] font-medium text-foreground ${controlPress}`}
              >
                Dismiss
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={notice.busy}
                  className={`inline-flex h-8 shrink-0 items-center rounded-full bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg disabled:opacity-50 ${controlPress}`}
                >
                  {notice.busy ? "Undoing…" : "Undo"}
                </button>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={onDismiss}
                  className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-pill hover:text-foreground ${controlPress}`}
                >
                  ×
                </button>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );

  if (!mounted) return <div role="status" className="sr-only" />;
  return createPortal(body, document.body);
}
