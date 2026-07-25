import { NextResponse } from "next/server";
import { getMongoEnvError } from "@/lib/db/mongodb";
import { findUserByValidResetToken, updateUserPassword } from "@/lib/db/repositories";
import { hashPassword } from "@/lib/password";
import { getPasswordRequirementIssues } from "@/lib/password-policy";

export const runtime = "nodejs";

type ResetPasswordBody = {
  token?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  let body: ResetPasswordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });
  }

  const passwordIssues = getPasswordRequirementIssues(password);
  if (passwordIssues.length > 0) {
    return NextResponse.json(
      { error: `Password must include: ${passwordIssues.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const user = await findUserByValidResetToken(token);
    if (!user) {
      return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    await updateUserPassword(user.id, passwordHash);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/auth/reset-password:", e);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
