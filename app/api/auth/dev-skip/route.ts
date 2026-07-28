import { NextResponse } from "next/server";
import { ensureDemoUser } from "@/lib/db/repositories";
import { DEV_USER_EMAIL, DEV_USER_ID } from "@/lib/dev-user";
import { attachSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Signs the browser in as the seeded demo user so proxy.ts's session check
 * passes without a real signup/login round-trip.
 */
export async function POST() {
  try {
    const user = await ensureDemoUser(DEV_USER_ID, DEV_USER_EMAIL);
    const response = NextResponse.json({ ok: true, userId: user.id });
    return attachSessionCookie(response, user.id);
  } catch (e) {
    console.error("POST /api/auth/dev-skip:", e);
    return NextResponse.json({ error: "Failed to skip sign-in" }, { status: 500 });
  }
}
