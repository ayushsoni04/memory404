import { getAuthUser } from "@/lib/auth";
import { DEV_USER_EMAIL } from "@/lib/dev-user";

const DEFAULT_OWNER_EMAILS = ["ayush@memory404.design"];

function ownerAllowlist(): string[] {
  const fromEnv = process.env.OWNER_EMAIL?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_OWNER_EMAILS;
}

function isDevOwnerFallback(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.AUTH_BYPASS === "1"
  );
}

/** True when the email is on the owner allowlist (or the seeded dev user in local/bypass). */
export function isOwnerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (ownerAllowlist().includes(normalized)) return true;
  if (isDevOwnerFallback() && normalized === DEV_USER_EMAIL.toLowerCase()) {
    return true;
  }
  return false;
}

/** Server-only: resolves whether the current request is the product owner. */
export async function getIsOwner(): Promise<boolean> {
  const user = await getAuthUser();
  if (user) return isOwnerEmail(user.email);
  // No session — in bypass/dev, APIs use DEV_USER; treat the same for UI gates.
  if (isDevOwnerFallback()) return isOwnerEmail(DEV_USER_EMAIL);
  return false;
}
