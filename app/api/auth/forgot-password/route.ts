import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getMongoEnvError } from "@/lib/db/mongodb";
import { findUserByEmail, setPasswordResetToken } from "@/lib/db/repositories";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

type ForgotPasswordBody = {
  email?: unknown;
};

export async function POST(request: Request) {
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

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Always respond with the same shape whether or not the email exists —
  // don't let this endpoint be used to enumerate registered accounts.
  const genericResponse = NextResponse.json({ ok: true });
  if (!email) return genericResponse;

  try {
    const user = await findUserByEmail(email);
    if (!user) return genericResponse;

    const token = randomBytes(32).toString("hex");
    await setPasswordResetToken(user.id, token, new Date(Date.now() + RESET_TOKEN_TTL_MS));

    const { origin } = new URL(request.url);
    const resetUrl = `${origin}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (e) {
    console.error("POST /api/auth/forgot-password:", e);
    // Still return the generic response — don't leak whether this failed.
  }

  return genericResponse;
}
