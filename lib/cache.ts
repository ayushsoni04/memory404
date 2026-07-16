/**
 * Tiny in-process TTL cache.
 * Designed for process-scoped singletons that never change for the lifetime
 * of the server process (e.g. generalGroupId).
 */
export class TtlCache<V> {
  private store = new Map<string, { value: V; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  async getOrSet(key: string, fn: () => Promise<V>): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await fn();
    this.set(key, value);
    return value;
  }
}

/** generalGroupId almost never changes — cache it for 24 hours. */
export const groupIdCache = new TtlCache<string>(24 * 60 * 60 * 1_000);
