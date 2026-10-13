import { NextResponse } from "next/server";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { attachSessionCookie, issueSessionToken } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { getMongoEnvError } from "@/lib/db/mongodb";
import { findUserByEmail } from "@/lib/db/repositories";

export const runtime = "nodejs";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

const INVALID_CREDENTIALS = "Invalid email or password";

export async function POST(request: Request) {
  const limited = enforceAuthRateLimit(request, "login");
  if (limited) return limited;

  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const sessionVersion = user.sessionVersion ?? 0;
    const token = await issueSessionToken(user.id, sessionVersion);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, plan: user.plan },
      token,
    });
    return attachSessionCookie(response, user.id, sessionVersion);
  } catch (e) {
    console.error("POST /api/auth/login:", e);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
