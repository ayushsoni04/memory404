/**
 * A second Save note should not start another request.
 * The lock is set before the message is sent and cleared when it finishes.
 * @param {{ current: boolean }} lock
 */
export function claimNoteSave(lock) {
  if (!lock || lock.current) return false;
  lock.current = true;
  return true;
}

/** @param {{ current: boolean }} lock */
export function releaseNoteSave(lock) {
  if (!lock) return;
  lock.current = false;
}
