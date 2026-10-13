import { NextResponse } from "next/server";
import { ensureDemoUser } from "@/lib/db/repositories";
import { DEV_USER_EMAIL, DEV_USER_ID } from "@/lib/dev-user";
import { attachSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Signs the browser in as the seeded demo user so proxy.ts's session check
 * passes without a real signup/login round-trip. Development only.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    if (!process.env.SESSION_SECRET?.trim()) {
      return NextResponse.json(
        { error: "Auth is misconfigured: SESSION_SECRET is missing" },
        { status: 503 },
      );
    }

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
