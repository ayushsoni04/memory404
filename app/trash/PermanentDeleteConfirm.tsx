"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { permanentDeleteCopy, type PermanentDelete } from "./permanent-delete";

type Props = {
  pending: PermanentDelete;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function PermanentDeleteConfirm({
  pending,
  busy,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const copy = permanentDeleteCopy(pending);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const dialog = (
    <div className="fixed inset-0 z-[260] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => !busy && onCancel()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="permanent-delete-title"
        className="relative w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <h2 id="permanent-delete-title" className="text-sm font-medium text-foreground">
          {copy.title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{copy.detail}</p>
        {error ? (
          <p className="mt-3 text-[13px] text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-8 items-center rounded-full bg-pill px-3 text-[13px] font-medium text-foreground transition-[transform,opacity] duration-[160ms] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-8 items-center rounded-full border border-red-500/30 bg-red-500/10 px-3 text-[13px] font-medium text-red-400 transition-[transform,background-color] duration-[160ms] ease-[var(--ease-out)] hover:bg-red-500/20 active:scale-[0.97] disabled:opacity-50"
          >
            {busy ? "Deleting…" : copy.action}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}
