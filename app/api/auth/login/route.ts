import { NextResponse } from "next/server";
import { attachSessionCookie } from "@/lib/session";
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

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, plan: user.plan },
    });
    return attachSessionCookie(response, user.id);
  } catch (e) {
    console.error("POST /api/auth/login:", e);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
