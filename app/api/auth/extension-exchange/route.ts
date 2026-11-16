import { NextResponse } from "next/server";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { getMongoEnvError } from "@/lib/db/mongodb";
import { findUserById } from "@/lib/db/repositories";
import { consumeExtensionExchangeCode } from "@/lib/google-oauth";
import { issueSessionToken } from "@/lib/session";

export const runtime = "nodejs";

type Body = {
  code?: unknown;
};

export async function POST(request: Request) {
  const limited = enforceAuthRateLimit(request, "extension-exchange", 20);
  if (limited) return limited;

  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Exchange code required" }, { status: 400 });
  }

  try {
    const payload = await consumeExtensionExchangeCode(code);
    if (!payload) {
      return NextResponse.json(
        { error: "Sign-in link expired. Try Continue with Google again." },
        { status: 401 },
      );
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 401 });
    }
    if ((user.sessionVersion ?? 0) !== payload.sessionVersion) {
      return NextResponse.json(
        { error: "Sign-in link expired. Try Continue with Google again." },
        { status: 401 },
      );
    }

    const token = await issueSessionToken(user.id, user.sessionVersion ?? 0);
    return NextResponse.json({
      user: { id: user.id, email: user.email, plan: user.plan },
      token,
    });
  } catch (e) {
    console.error("POST /api/auth/extension-exchange:", e);
    return NextResponse.json({ error: "Failed to complete Google sign-in" }, { status: 500 });
  }
}
