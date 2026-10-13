/** Same-origin relative path only. Rejects protocol-relative and backslash tricks. */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }
  if (raw.includes("\\") || raw.includes("\n") || raw.includes("\r")) return "/";
  return raw;
}
