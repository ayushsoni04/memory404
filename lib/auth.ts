import { headers } from "next/headers";
import { findUserById } from "@/lib/db/repositories";
import { decryptSession, getSession } from "@/lib/session";

export type AuthUser = {
  id: string;
  email: string;
  plan: "free" | "pro" | "team";
};

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

async function userFromId(userId: string): Promise<AuthUser | null> {
  const row = await findUserById(userId);
  if (!row) return null;
  return { id: row.id, email: row.email, plan: row.plan as AuthUser["plan"] };
}

/** Reads `Authorization: Bearer <jwt>` if present. */
export async function getBearerToken(): Promise<string | null> {
  const headerStore = await headers();
  const authorization = headerStore.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

/**
 * Resolves the signed-in user from the session cookie or Bearer token.
 * Returns null when there is no valid credentials.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const session = await getSession();
    if (session) {
      const fromCookie = await userFromId(session.userId);
      if (fromCookie) return fromCookie;
    }

    const bearer = await getBearerToken();
    if (bearer) {
      const payload = await decryptSession(bearer);
      if (payload) {
        const fromBearer = await userFromId(payload.userId);
        if (fromBearer) return fromBearer;
      }
    }

    return null;
  } catch (e) {
    console.error("getAuthUser:", e);
    return null;
  }
}

/**
 * Guard for API routes: returns the signed-in user, or a 401 Response.
 * Accepts the `m404_session` cookie or `Authorization: Bearer <JWT>`.
 */
export async function requireAuth(): Promise<AuthUser | Response> {
  const user = await getAuthUser();
  if (user) return user;
  return unauthorizedResponse();
}

/** True when the value is an AuthUser (not a 401 Response). */
export function isAuthUser(value: AuthUser | Response): value is AuthUser {
  return !(value instanceof Response);
}
