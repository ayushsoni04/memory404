import { NextResponse } from "next/server";
import { attachSessionCookie } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { getPasswordRequirementIssues } from "@/lib/password-policy";
import { getMongoEnvError, isDuplicateKeyError } from "@/lib/db/mongodb";
import { createUserWithPassword, findUserByEmail } from "@/lib/db/repositories";
import type { UserUtm } from "@/lib/db/types";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignupBody = {
  email?: unknown;
  password?: unknown;
  leadSource?: unknown;
  utm?: unknown;
};

export async function POST(request: Request) {
  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  let body: SignupBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const leadSource = typeof body.leadSource === "string" ? body.leadSource : undefined;
  const utm = body.utm && typeof body.utm === "object" ? (body.utm as UserUtm) : undefined;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const passwordIssues = getPasswordRequirementIssues(password);
  if (passwordIssues.length > 0) {
    return NextResponse.json(
      { error: `Password must include: ${passwordIssues.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUserWithPassword({ email, passwordHash, leadSource, utm });
    const response = NextResponse.json(
      { user: { id: user.id, email: user.email, plan: user.plan } },
      { status: 201 },
    );
    return attachSessionCookie(response, user.id);
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
    console.error("POST /api/auth/signup:", e);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
