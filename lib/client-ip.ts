/**
 * Best-effort client IP for rate limits.
 * Prefer `x-real-ip` (set by the platform). Otherwise use the rightmost
 * `x-forwarded-for` hop, which a single trusted proxy appends.
 */
export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }

  return "unknown";
}
