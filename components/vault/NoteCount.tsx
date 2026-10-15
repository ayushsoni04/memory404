"use client";

import { noteCountLabel, noteIssue } from "@/lib/note-limit";

/** Quiet counter that appears only when a note is near, or past, the limit. */
export function NoteCount({ notes, id }: { notes: string; id: string }) {
  const label = noteCountLabel(notes);
  if (!label) return null;
  const over = noteIssue(notes) != null;
  return (
    <p
      id={id}
      className={`text-[11px] ${over ? "text-danger" : "text-subtle"}`}
      aria-live="polite"
    >
      {label}
    </p>
  );
}
