import { NextResponse } from "next/server";
import { DEV_USER_ID } from "@/lib/dev-user";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Dev-only convenience: signs the browser in as the seeded dev user so
 * proxy.ts's session check passes without a real signup/login round-trip.
 * Mirrors the DEV_USER fallback requireAuth() already uses for API routes.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await createSession(DEV_USER_ID);
  return NextResponse.json({ ok: true });
}
