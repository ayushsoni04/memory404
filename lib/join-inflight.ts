/**
 * Share one in-flight request for the same key.
 * A second caller waits for the first instead of starting another.
 * The entry is removed when the request finishes, including when it fails.
 */
export function joinInflight<T>(
  inflight: Map<string, Promise<T>>,
  key: string,
  start: () => Promise<T>,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = start().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
