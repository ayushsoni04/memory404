/** Express CORS allow-list: configured origins, this product's Vercel hosts, and the extension. */
export function isAllowedCorsOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.startsWith("chrome-extension://")) return true;

  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return url.hostname === "vercel.app" || url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
