/** A note is a reminder, not a pasted article. */
export const NOTE_MAX = 2_000;

export const NOTE_TOO_LONG = "Notes must be 2,000 characters or fewer.";

/** Why a note cannot be saved. Blank is allowed and clears the note. */
export function noteIssue(notes: string): string | null {
  if (notes.trim().length > NOTE_MAX) return NOTE_TOO_LONG;
  return null;
}
