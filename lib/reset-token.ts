import { createHash } from "node:crypto";

/** Store and compare reset tokens as SHA-256 hex, never the raw secret. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
