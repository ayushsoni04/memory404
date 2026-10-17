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
