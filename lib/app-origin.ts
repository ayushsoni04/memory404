/** Origin used in emails. Prefers an explicit app URL over the request host. */
export function trustedAppOrigin(request: Request): string {
  const configured = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Ignore a malformed override and fall back to the request URL.
    }
  }
  return new URL(request.url).origin;
}
