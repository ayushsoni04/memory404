import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { getMongoEnvError } from "@/lib/db/mongodb";
import { findUserById, updateUserPassword } from "@/lib/db/repositories";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getPasswordRequirementIssues } from "@/lib/password-policy";
import { rateLimit } from "@/lib/rate-limit";
import { attachSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

type Body = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

export async function POST(request: Request) {
  const limited = enforceAuthRateLimit(request, "change-password", 5);
  if (limited) return limited;

  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const byUser = rateLimit(`auth:change-password:${auth.id}`, 5, 60_000);
  if (!byUser.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required" },
      { status: 400 },
    );
  }

  const issues = getPasswordRequirementIssues(newPassword);
  if (issues.length > 0) {
    return NextResponse.json(
      { error: `Password must include: ${issues.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const user = await findUserById(auth.id);
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const sessionVersion = await updateUserPassword(auth.id, passwordHash);
    const response = NextResponse.json({ ok: true });
    return attachSessionCookie(response, auth.id, sessionVersion);
  } catch (e) {
    console.error("POST /api/me/password:", e);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
