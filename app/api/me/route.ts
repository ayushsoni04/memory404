import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMongoEnvError, isDuplicateKeyError } from "@/lib/db/mongodb";
import {
  deleteUserAccount,
  findUserById,
  findUserByUsername,
  updateUserProfile,
} from "@/lib/db/repositories";
import {
  getAvatarUrlIssues,
  getNameIssues,
  getUsernameIssues,
  isValidBannerStyle,
  normalizeUsername,
  toPublicProfile,
} from "@/lib/profile";
import { clearSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

type PatchBody = {
  name?: unknown;
  username?: unknown;
  avatarUrl?: unknown;
  bannerStyle?: unknown;
};

export async function GET() {
  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const user = await findUserById(auth.id);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicProfile(user) });
}

export async function PATCH(request: Request) {
  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const patch: {
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    bannerStyle?: string | null;
  } = {};

  if ("name" in body) {
    if (body.name === null) {
      patch.name = null;
    } else if (typeof body.name === "string") {
      const name = body.name.trim();
      const nameIssues = getNameIssues(name);
      if (nameIssues.length > 0) {
        return NextResponse.json({ error: nameIssues[0] }, { status: 400 });
      }
      patch.name = name || null;
    } else {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
  }

  if ("username" in body) {
    if (body.username === null || body.username === "") {
      patch.username = null;
    } else if (typeof body.username === "string") {
      const username = normalizeUsername(body.username);
      const issues = getUsernameIssues(username);
      if (issues.length > 0) {
        return NextResponse.json(
          { error: `Username must be: ${issues.join("; ")}` },
          { status: 400 },
        );
      }
      const taken = await findUserByUsername(username);
      if (taken && taken.id !== auth.id) {
        return NextResponse.json(
          { error: "That username is already taken" },
          { status: 409 },
        );
      }
      patch.username = username;
    } else {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }
  }

  if ("avatarUrl" in body) {
    if (body.avatarUrl === null || body.avatarUrl === "") {
      patch.avatarUrl = null;
    } else if (typeof body.avatarUrl === "string") {
      const issues = getAvatarUrlIssues(body.avatarUrl);
      if (issues.length > 0) {
        return NextResponse.json({ error: issues[0] }, { status: 400 });
      }
      patch.avatarUrl = body.avatarUrl;
    } else {
      return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
    }
  }

  if ("bannerStyle" in body) {
    if (typeof body.bannerStyle !== "string" || !isValidBannerStyle(body.bannerStyle)) {
      return NextResponse.json({ error: "Invalid banner style" }, { status: 400 });
    }
    patch.bannerStyle = body.bannerStyle;
  }

  try {
    const user = await updateUserProfile(auth.id, patch);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ user: toPublicProfile(user) });
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      return NextResponse.json(
        { error: "That username is already taken" },
        { status: 409 },
      );
    }
    console.error("PATCH /api/me:", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE() {
  const envErr = getMongoEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    await deleteUserAccount(auth.id);
    const response = NextResponse.json({ ok: true });
    return clearSessionCookie(response);
  } catch (e) {
    console.error("DELETE /api/me:", e);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
