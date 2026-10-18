/** Same rule as the website sign-in form. A host without a dot is not enough. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_INVALID = "Enter a valid email address";

/**
 * Why this address cannot be used to sign in, or null when it can.
 * @param {unknown} raw
 */
export function loginEmailIssue(raw) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(value)) return EMAIL_INVALID;
  return null;
}

/** Keep the sign-in fields up for a session error and for an address that is not an email. */
export function keepSignInForm(error) {
  if (typeof error !== "string") return false;
  if (error === EMAIL_INVALID) return true;
  return /sign in/i.test(error);
}
