import { rateLimit } from "@/lib/rate-limit";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Per-IP auth rate limit. Returns a 429 Response when exceeded, otherwise null.
 */
export function enforceAuthRateLimit(
  request: Request,
  routeKey: string,
  maxRequests = 10,
  windowMs = 60_000,
): Response | null {
  const key = `auth:${routeKey}:${clientIp(request)}`;
  const result = rateLimit(key, maxRequests, windowMs);
  if (result.ok) return null;
  return new Response(JSON.stringify({ error: "Too many requests. Try again shortly." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": "60",
    },
  });
}
