/** A note is a reminder, not a pasted article. */
export const NOTE_MAX = 2_000;

/** Show the count once a note is this close to the limit. Shorter notes stay quiet. */
export const NOTE_COUNT_AT = 1_600;

export const NOTE_TOO_LONG = "Notes must be 2,000 characters or fewer.";

/** The button that stores a note. Same words on the card, the palette, and the link. */
export const SAVE_NOTE_LABEL = "Save note";

/** Shown instead of the save button when the note is still empty. */
export const NOTE_DONE_LABEL = "Done";

/** Why a note cannot be saved. Blank is allowed and clears the note. */
export function noteIssue(notes: string): string | null {
  if (notes.trim().length > NOTE_MAX) return NOTE_TOO_LONG;
  return null;
}

function grouped(value: number): string {
  return value.toLocaleString("en-US");
}

/** "1,600 of 2,000" once a note is near the limit. Short notes return null. */
export function noteCountLabel(notes: string): string | null {
  const length = notes.trim().length;
  if (length < NOTE_COUNT_AT) return null;
  return `${grouped(length)} of ${grouped(NOTE_MAX)}`;
}
