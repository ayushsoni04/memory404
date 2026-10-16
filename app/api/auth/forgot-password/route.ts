import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { EMAIL_INVALID, emailIssue, normalizeEmail } from "@/lib/auth-email";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { getMongoEnvError } from "@/lib/db/mongodb";
import { findUserByEmail, setPasswordResetToken } from "@/lib/db/repositories";
import { trustedAppOrigin } from "@/lib/app-origin";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

type ForgotPasswordBody = {
  email?: unknown;
};

export async function POST(request: Request) {
  const limited = enforceAuthRateLimit(request, "forgot-password", 5);
  if (limited) return limited;

  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  let body: ForgotPasswordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

  // A malformed address is not an account, so this can say so.
  // A real address still gets the same response whether or not it is registered.
  if (emailIssue(email)) {
    return NextResponse.json({ error: EMAIL_INVALID }, { status: 400 });
  }

  const genericResponse = NextResponse.json({ ok: true });

  try {
    const user = await findUserByEmail(email);
    if (!user) return genericResponse;

    const token = randomBytes(32).toString("hex");
    await setPasswordResetToken(user.id, token, new Date(Date.now() + RESET_TOKEN_TTL_MS));

    const resetUrl = `${trustedAppOrigin(request)}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (e) {
    console.error("POST /api/auth/forgot-password:", e);
    // Still return the generic response — don't leak whether this failed.
  }

  return genericResponse;
}
