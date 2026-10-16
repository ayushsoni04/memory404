/** A note is a reminder, not a pasted article. Keep in step with lib/note-limit.ts. */
export const NOTE_MAX = 2000;

/** Show the count once a note is this close to the limit. Shorter notes stay quiet. */
export const NOTE_COUNT_AT = 1600;

export const NOTE_TOO_LONG = "Notes must be 2,000 characters or fewer.";

/** Why a note cannot be saved. Blank is allowed and clears the note. */
export function noteIssue(notes) {
  if (String(notes ?? "").trim().length > NOTE_MAX) return NOTE_TOO_LONG;
  return null;
}

function grouped(value) {
  return value.toLocaleString("en-US");
}

/** "1,600 of 2,000" once a note is near the limit. Short notes return null. */
export function noteCountLabel(notes) {
  const length = String(notes ?? "").trim().length;
  if (length < NOTE_COUNT_AT) return null;
  return `${grouped(length)} of ${grouped(NOTE_MAX)}`;
}
