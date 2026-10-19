"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import MorphText from "@/components/MorphText";
import { linkUrlDraftIssue, linkUrlIssue, type LinkApiRow } from "@/lib/links";
import { saveFailureMessage } from "@/lib/save-failure";
import { NOTE_DONE_LABEL, noteCountLabel, noteIssue, SAVE_NOTE_LABEL } from "@/lib/note-limit";
import { saveLinkNote } from "@/lib/save-link-note";
import { NoteCount } from "@/components/vault/NoteCount";
import { controlPress } from "@/components/vault/types";

const addLinkField =
  "w-full rounded-[4px] border border-dashed border-border bg-surface px-2.5 py-2 text-[13px] text-foreground outline-none placeholder:text-subtle focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)]";

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
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const saveGen = useRef(0);
  const savingNoteRef = useRef(false);
  const [savingNote, setSavingNote] = useState(false);

  const [showNotesForm, setShowNotesForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedLink, setSavedLink] = useState<LinkApiRow | null>(null);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!showNotesForm) return;
    const id = window.setTimeout(() => notesRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [showNotesForm]);

  const finishFlow = useCallback(async () => {
    if (savingNoteRef.current || !savedLink) return;
    savingNoteRef.current = true;
    setSavingNote(true);
    try {
      let finalLink = savedLink;
      const trimmed = notes.trim();
      if (trimmed) {
        const result = await saveLinkNote(savedLink.id, trimmed);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        finalLink = result.link;
      }
      setError(null);
      onSaved(finalLink);
      setOpen(false);
      setUrl("");
      setSaving(false);
      setShowSuccess(false);
      setShowNotesForm(false);
      setNotes("");
      setSavedLink(null);
      openerRef.current?.focus();
    } finally {
      savingNoteRef.current = false;
      setSavingNote(false);
    }
  }, [notes, onSaved, savedLink]);

  const cancel = (keyboardInitiated = false) => {
    if (saving) return;
    setSkipMotion(keyboardInitiated);
    setOpen(false);
    setUrl("");
    setError(null);
    openerRef.current?.focus();
    if (keyboardInitiated) {
      window.requestAnimationFrame(() => setSkipMotion(false));
    }
  };

  const submit = async () => {
    const trimmed = url.trim();
    const issue = linkUrlIssue(trimmed);
    if (issue) {
      setError(issue);
      inputRef.current?.focus();
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
        setShowNotesForm(true);
      }
    } catch {
      if (gen !== saveGen.current) return;
      setError(saveFailureMessage(null, true));
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
    <article className="mind-card break-inside-avoid">
      <div className="mind-card-shell group relative min-h-[140px] overflow-hidden rounded-[4px]">
        <span className="mind-card-stroke" aria-hidden />
        <div className="relative z-[1] min-h-[140px] overflow-hidden rounded-[4px]">
          <div
            className={panelClass(phase === "idle")}
            aria-hidden={phase !== "idle"}
          >
            <button
              ref={openerRef}
              type="button"
              onClick={() => setOpen(true)}
              disabled={!groupId}
              tabIndex={phase === "idle" ? 0 : -1}
              className={`flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-[4px] border border-dashed border-border-strong bg-transparent px-3 py-6 text-center hover:border-foreground/40 hover:text-foreground disabled:opacity-40 ${controlPress}`}
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
                type="text"
                inputMode="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(linkUrlDraftIssue(e.target.value));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancel(true);
                  }
                }}
                tabIndex={phase === "form" ? 0 : -1}
                placeholder="example.com/page"
                aria-label="Link"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "add-link-url-error" : undefined}
                className={addLinkField}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!url.trim() || !groupId || Boolean(linkUrlDraftIssue(url))}
                  tabIndex={phase === "form" ? 0 : -1}
                  className={`inline-flex h-7 items-center rounded-full bg-pill-active px-2.5 text-[13px] font-medium text-pill-active-fg hover:opacity-90 disabled:opacity-45 ${controlPress}`}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => cancel()}
                  tabIndex={phase === "form" ? 0 : -1}
                  className={`inline-flex h-7 items-center rounded-full bg-pill px-2.5 text-[13px] text-muted hover:bg-pill-hover hover:text-foreground ${controlPress}`}
                >
                  Cancel
                </button>
              </div>
              {error ? (
                <p id="add-link-url-error" className="text-[11px] text-danger" role="alert">
                  {error}
                </p>
              ) : null}
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
                <ThinkingOrb state="searching" size={64} speed={0.95} />
              )}
            </div>
          </div>

          <div
            className={panelClass(phase === "notes")}
            aria-hidden={phase !== "notes"}
          >
            <div className="relative z-[2] flex min-h-[140px] flex-col justify-center gap-2 p-3">
              <label htmlFor="add-link-note" className="text-[11px] text-muted">
                Add a note
              </label>
              <textarea
                id="add-link-note"
                ref={notesRef}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setError(noteIssue(e.target.value));
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Escape" || notes.trim()) return;
                  e.preventDefault();
                  void finishFlow();
                }}
                tabIndex={phase === "notes" ? 0 : -1}
                placeholder="What should you remember?"
                rows={2}
                aria-invalid={error ? true : undefined}
                aria-describedby={
                  [
                    noteCountLabel(notes) ? "add-link-note-count" : null,
                    error ? "add-link-note-error" : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                className={`${addLinkField} resize-none py-1.5`}
              />
              <NoteCount notes={notes} id="add-link-note-count" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void finishFlow()}
                  disabled={savingNote || Boolean(noteIssue(notes))}
                  aria-busy={savingNote || undefined}
                  tabIndex={phase === "notes" ? 0 : -1}
                  className={`inline-flex h-7 items-center rounded-full bg-pill-active px-2.5 text-[13px] font-medium text-pill-active-fg disabled:opacity-50 ${controlPress}`}
                >
                  <MorphText duration={220}>
                    {savingNote ? "Saving…" : notes.trim() ? SAVE_NOTE_LABEL : NOTE_DONE_LABEL}
                  </MorphText>
                </button>
              </div>
              {error ? (
                <p id="add-link-note-error" className="text-[11px] text-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
