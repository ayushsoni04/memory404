/** Same rule the sign-up API uses. A bare host like user@localhost is not enough. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_INVALID = "Enter a valid email address";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Why this address cannot be used to create an account, or null when it can. */
export function emailIssue(raw: string): string | null {
  if (!EMAIL_RE.test(normalizeEmail(raw))) return EMAIL_INVALID;
  return null;
}
