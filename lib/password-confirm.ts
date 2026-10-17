/**
 * The confirmation is still the start of the password.
 * A mismatch that only appears because the rest has not been typed yet stays quiet.
 */
export function confirmPasswordStillTyping(password: string, confirm: string): boolean {
  return (
    confirm.length > 0 &&
    confirm.length < password.length &&
    password.startsWith(confirm)
  );
}

/**
 * When to show a confirmation error.
 * An empty confirmation, or one that is still a prefix, waits until submit.
 * A confirmation that has already diverged is shown immediately.
 */
export function visibleConfirmPasswordError(
  password: string,
  confirm: string,
  message: string | undefined,
  attempted: boolean,
): string | null {
  if (!message) return null;
  if (attempted) return message;
  if (!confirm || confirmPasswordStillTyping(password, confirm)) return null;
  return message;
}
