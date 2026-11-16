import { safeRedirectPath } from "@/lib/safe-redirect";

/** Browser-safe: no server or database imports, so client components can use it. */
export type GoogleOAuthClient = "web" | "extension";

export function googleAuthStartUrl(
  client: GoogleOAuthClient,
  redirect?: string | null,
): string {
  const params = new URLSearchParams();
  if (client === "extension") params.set("client", "extension");
  const safe = safeRedirectPath(redirect);
  if (safe !== "/") params.set("redirect", safe);
  const query = params.toString();
  return query ? `/api/auth/google?${query}` : "/api/auth/google";
}
