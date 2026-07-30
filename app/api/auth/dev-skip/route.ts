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
    if (!process.env.SESSION_SECRET?.trim()) {
      return NextResponse.json(
        { error: "Auth is misconfigured: SESSION_SECRET is missing" },
        { status: 503 },
      );
    }

    // Best-effort seed; requireAuth already falls back to DEV_USER if the row is absent.
    let userId = DEV_USER_ID;
    try {
      const user = await ensureDemoUser(DEV_USER_ID, DEV_USER_EMAIL);
      userId = user.id;
    } catch (e) {
      console.error("ensureDemoUser (non-fatal):", e);
    }

    const response = NextResponse.json({ ok: true });
    return attachSessionCookie(response, userId);
  } catch (e) {
    console.error("POST /api/auth/dev-skip:", e);
    const message = e instanceof Error ? e.message : "Failed to skip sign-in";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
