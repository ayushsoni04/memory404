/**
 * In-memory rate limiter. Per-instance only — fine for a single Node process,
 * but resets on redeploy and doesn't share state across instances. Swap for
 * Upstash `@upstash/ratelimit` (or similar) once running more than one
 * instance matters.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  maxRequests = 60,
  windowMs = 60_000,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || now > entry.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1 };
  }
  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { ok: entry.count <= maxRequests, remaining };
}
