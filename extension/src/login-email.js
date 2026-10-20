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

/** A dropped connection, worded so the sign-in form stays on screen. */
export const SIGN_IN_UNREACHABLE =
  "Couldn't reach memory404. Check your connection and sign in again.";

/** Keep the sign-in fields up for a session error and for an address that is not an email. */
export function keepSignInForm(error) {
  if (typeof error !== "string" || !error.trim()) return false;
  if (error === EMAIL_INVALID) return true;
  if (/invalid email or password/i.test(error)) return true;
  if (/email and password are required/i.test(error)) return true;
  return /sign in/i.test(error);
}

/**
 * A failed sign-in belongs on the password field.
 * The prompt that asks you to sign in, and a bad email address, do not.
 */
export function passwordFieldInvalid(error) {
  if (!keepSignInForm(error)) return false;
  if (error === EMAIL_INVALID) return false;
  if (/^sign in to\b/i.test(error)) return false;
  return true;
}

/** Word a sign-in failure so the form stays up, including a dropped connection. */
export function signInFailureMessage(raw) {
  const message = typeof raw === "string" && raw.trim() ? raw.trim() : "Failed to sign in";
  if (/couldn.t reach memory404/i.test(message)) return SIGN_IN_UNREACHABLE;
  return message;
}
