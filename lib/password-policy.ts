/**
 * Enforced both here (client hint) and server-side in app/api/auth/signup and
 * reset-password route handlers — keep the two in sync.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter, and a number.";

export function getPasswordRequirementIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    issues.push(`At least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!/[a-z]/.test(password)) issues.push("A lowercase letter");
  if (!/[A-Z]/.test(password)) issues.push("An uppercase letter");
  if (!/[0-9]/.test(password)) issues.push("A number");
  return issues;
}

/**
 * When to show a password-rule error.
 * A password that is still shorter than the minimum is being typed, and the
 * hint under the field already says what is required. A password long enough
 * to judge, or a submit, shows the error.
 */
export function visiblePasswordRequirementError(
  password: string,
  message: string | undefined,
  attempted: boolean,
): string | null {
  if (!message) return null;
  if (attempted) return message;
  if (password.length < PASSWORD_MIN_LENGTH) return null;
  return message;
}
