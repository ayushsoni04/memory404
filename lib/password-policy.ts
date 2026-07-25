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
