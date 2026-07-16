/** Base URL for the API (Render). Empty string = same origin (Next.js /api routes). */
export function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  return base.replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBase();
  return base ? `${base}${normalized}` : normalized;
}
