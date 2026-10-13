/** The note to show under a search result, or nothing when it is blank. */
export function visibleSearchNote(notes: string | null | undefined): string | null {
  const note = notes?.trim();
  return note ? note : null;
}
