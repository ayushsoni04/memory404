"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { RisingHelixFill } from "@/components/RisingHelixFill";
import type { LinkApiRow } from "@/lib/links";

type Props = {
  groupId: string | null;
  onSaved: (link: LinkApiRow) => void;
  saveLink: (
    url: string,
    groupId: string,
  ) => Promise<{ ok: true; link: LinkApiRow } | { ok: false; error: string }>;
};

type Phase = "idle" | "form" | "saving" | "success" | "notes";

export default function AddLinkCard({
  groupId,
  onSaved,
  saveLink,
}: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipMotion, setSkipMotion] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const saveGen = useRef(0);

  const [showNotesForm, setShowNotesForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [timerActive, setTimerActive] = useState(false);
  const [savedLink, setSavedLink] = useState<LinkApiRow | null>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const finishFlow = useCallback(async () => {
    if (!savedLink) return;
    setTimerActive(false);
    let finalLink = savedLink;
    if (notes.trim()) {
      try {
        const res = await fetch(`/api/links/${savedLink.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notes.trim() }),
        });
        const data = await res.json();
        if (res.ok && data.link) {
          finalLink = data.link;
        }
      } catch (e) {
        console.error("Failed to save notes:", e);
      }
    }
    onSaved(finalLink);
    setOpen(false);
    setUrl("");
    setSaving(false);
    setShowSuccess(false);
    setShowNotesForm(false);
    setNotes("");
    setSavedLink(null);
  }, [notes, onSaved, savedLink]);

  useEffect(() => {
    if (!timerActive || countdown <= 0) {
      if (timerActive && countdown === 0) {
        const timer = window.setTimeout(() => void finishFlow(), 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, finishFlow, timerActive]);

  const cancel = (keyboardInitiated = false) => {
    if (saving) return;
    setSkipMotion(keyboardInitiated);
    setOpen(false);
    setUrl("");
    setError(null);
    if (keyboardInitiated) {
      window.requestAnimationFrame(() => setSkipMotion(false));
    }
  };

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a URL");
      return;
    }
    if (!groupId) {
      setError("No group selected");
      return;
    }

    const gen = ++saveGen.current;
    setSaving(true);
    setShowSuccess(false);
    setError(null);

    const pendingUrl = trimmed;

    try {
      const result = await saveLink(pendingUrl, groupId);
      if (gen !== saveGen.current) return;
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }

      setShowSuccess(true);
      setSavedLink(result.link);
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (gen === saveGen.current) {
        setUrl("");
        setCountdown(5);
        setTimerActive(true);
        setShowNotesForm(true);
      }
    } catch {
      if (gen !== saveGen.current) return;
      setError("Network error — try again");
      setSaving(false);
    }
  };

  const phase: Phase = showNotesForm
    ? "notes"
    : saving
      ? showSuccess
        ? "success"
        : "saving"
      : open
        ? "form"
        : "idle";

  const panelClass = (active: boolean) =>
    `add-link-panel${active ? " is-active" : ""}${skipMotion ? " is-instant" : ""}`;

  return (
    <article className="mind-card mb-3 break-inside-avoid">
      <div className="mind-card-shell group relative min-h-[140px] overflow-hidden rounded-[4px]">
        <span className="mind-card-stroke" aria-hidden />
        <div className="relative z-[1] min-h-[140px] overflow-hidden rounded-[4px]">
          {(phase === "saving" || phase === "success") && (
            <RisingHelixFill active />
          )}

          <div
            className={panelClass(phase === "idle")}
            aria-hidden={phase !== "idle"}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={!groupId}
              tabIndex={phase === "idle" ? 0 : -1}
              className="flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-[4px] border border-dashed border-muted/50 bg-transparent px-3 py-6 text-center outline-none transition-colors hover:border-foreground/35 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/40 disabled:opacity-40"
            >
              <Plus className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
              <span className="text-[13px] font-medium text-muted">Add link</span>
            </button>
          </div>

          <div
            className={panelClass(phase === "form")}
            aria-hidden={phase !== "form"}
          >
            <form
              className="relative z-[2] flex min-h-[140px] flex-col justify-center gap-2 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancel(true);
                  }
                }}
                tabIndex={phase === "form" ? 0 : -1}
                placeholder="https://…"
                className="w-full rounded-[4px] border border-dashed border-border bg-surface px-2.5 py-2 text-[13px] text-foreground outline-none placeholder:text-subtle focus:border-foreground/40"
                autoComplete="off"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!url.trim() || !groupId}
                  tabIndex={phase === "form" ? 0 : -1}
                  className="inline-flex h-7 items-center rounded-full bg-pill-active px-2.5 text-[13px] font-medium text-pill-active-fg disabled:opacity-45"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => cancel()}
                  tabIndex={phase === "form" ? 0 : -1}
                  className="inline-flex h-7 items-center rounded-full bg-pill px-2.5 text-[13px] text-muted hover:bg-pill-hover"
                >
                  Cancel
                </button>
              </div>
              {error ? <p className="text-[11px] text-danger">{error}</p> : null}
            </form>
          </div>

          <div
            className={panelClass(phase === "saving" || phase === "success")}
            aria-hidden={phase !== "saving" && phase !== "success"}
          >
            <div className="relative z-[2] flex min-h-[140px] flex-col items-center justify-center pt-2">
              {showSuccess ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="t-success-check" data-state="in" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-10">
                      <path d="M20 6L9 17L4 12" style={{ strokeDasharray: 24, strokeDashoffset: 24 }} />
                    </svg>
                  </span>
                  <span className="text-[12px] text-success font-medium">Link added!</span>
                </div>
              ) : (
                <span className="text-[12px] text-muted">Saving…</span>
              )}
            </div>
          </div>

          <div
            className={panelClass(phase === "notes")}
            aria-hidden={phase !== "notes"}
          >
            <div className="relative z-[2] flex min-h-[140px] flex-col justify-center gap-2 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">
                  {timerActive ? `Add notes (auto-done in ${countdown}s)` : "Add notes"}
                </span>
                {timerActive && (
                  <button
                    type="button"
                    onClick={() => setTimerActive(false)}
                    tabIndex={phase === "notes" ? 0 : -1}
                    className="text-[11px] text-muted hover:underline"
                  >
                    Pause
                  </button>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setTimerActive(false);
                }}
                onFocus={() => setTimerActive(false)}
                tabIndex={phase === "notes" ? 0 : -1}
                placeholder="Add optional notes here..."
                rows={2}
                className="w-full rounded-[4px] border border-dashed border-border bg-surface px-2.5 py-1.5 text-[13px] text-foreground outline-none placeholder:text-subtle focus:border-foreground/40 resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={finishFlow}
                  tabIndex={phase === "notes" ? 0 : -1}
                  className="inline-flex h-7 items-center rounded-full bg-pill-active px-2.5 text-[13px] font-medium text-pill-active-fg"
                >
                  {notes.trim() ? "Save Notes" : "Done"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
