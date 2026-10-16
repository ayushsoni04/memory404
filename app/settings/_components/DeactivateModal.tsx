"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { AppLoader } from "@/components/AppLoader";
import { isDeactivateConfirmation } from "@/lib/deactivate-confirm";
import { useDialogContainment } from "@/lib/dialog-focus";
import { controlPress } from "@/components/vault/types";

type DeactivateModalProps = {
  open: boolean;
  onClose: () => void;
  deactivateInput: string;
  setDeactivateInput: (value: string) => void;
  isDeactivating: boolean;
  deactivatedSuccess: boolean;
  error?: string | null;
  onSubmit: (e: React.FormEvent) => void;
};

export function DeactivateModal({
  open,
  onClose,
  deactivateInput,
  setDeactivateInput,
  isDeactivating,
  deactivatedSuccess,
  error = null,
  onSubmit,
}: DeactivateModalProps) {
  const portalRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = isDeactivating || deactivatedSuccess;
  useDialogContainment(open, portalRef, dialogRef, inputRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={portalRef}
      className="mind-modal-backdrop-in fixed inset-0 z-[280] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div
        data-deactivate-backdrop=""
        className="absolute inset-0"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-busy={isDeactivating}
        aria-labelledby="deactivate-title"
        aria-describedby="deactivate-detail"
        className="mind-modal-panel-in relative w-full max-w-[420px] space-y-4 rounded-xl border border-danger/35 bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-center gap-2.5 text-danger">
          <AlertTriangle className="size-5" aria-hidden />
          <h3
            id="deactivate-title"
            className="font-mono text-sm font-bold uppercase tracking-wider"
          >
            Confirm Deactivation
          </h3>
        </div>

        <p id="deactivate-detail" className="text-xs leading-relaxed text-muted">
          This action is <strong className="text-foreground">permanent</strong>. Your
          account, links, and groups will be deleted and you will be signed out.
        </p>

        {deactivatedSuccess ? (
          <div
            className="animate-pulse rounded-lg border border-success/30 bg-success/10 p-3 text-center text-xs font-semibold text-success"
            role="status"
          >
            Account deleted. Redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error ? (
              <p id="deactivate-error" className="text-xs text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] font-medium uppercase text-subtle">
                Type <code className="select-none text-danger">deactivate</code> to confirm
              </span>
              <input
                ref={inputRef}
                type="text"
                value={deactivateInput}
                onChange={(e) => setDeactivateInput(e.target.value)}
                placeholder="deactivate"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "deactivate-error" : undefined}
                className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 font-mono text-xs text-foreground outline-none focus-visible:border-danger/50 focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_45%,transparent)]"
                required
                disabled={isDeactivating}
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeactivating}
                className={`h-8 flex-1 cursor-pointer rounded-lg border border-border text-xs font-medium text-muted hover:bg-pill disabled:opacity-50 ${controlPress}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isDeactivateConfirmation(deactivateInput) || isDeactivating}
                className={`flex h-8 flex-1 cursor-pointer items-center justify-center rounded-lg bg-danger text-xs font-semibold text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 ${controlPress}`}
              >
                {isDeactivating ? (
                  <AppLoader compact progressive label="deactivating" />
                ) : (
                  "Wipe everything"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
