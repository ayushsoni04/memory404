/** A renamed link stays readable on the card and in search. */
export const LINK_TITLE_MAX = 200;

export const LINK_TITLE_TOO_LONG = `Names must be ${LINK_TITLE_MAX} characters or fewer.`;

export const LINK_TITLE_LINE_BREAK = "Names can't include line breaks.";

/** Why a custom name cannot be saved. Blank is allowed and restores the page title. */
export function linkTitleIssue(title: string): string | null {
  const trimmed = title.trim();
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return LINK_TITLE_LINE_BREAK;
  if (trimmed.length > LINK_TITLE_MAX) return LINK_TITLE_TOO_LONG;
  return null;
}
