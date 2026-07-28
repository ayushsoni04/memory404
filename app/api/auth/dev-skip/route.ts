import { NextResponse } from "next/server";
import { DEV_USER_ID } from "@/lib/dev-user";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Convenience: signs the browser in as the seeded demo user so
 * proxy.ts's session check passes without a real signup/login round-trip.
 * Mirrors the DEV_USER fallback requireAuth() already uses for API routes.
 */
export async function POST() {
  await createSession(DEV_USER_ID);
  return NextResponse.json({ ok: true });
}
