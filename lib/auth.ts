import { findUserById } from "@/lib/db/repositories";
import { DEV_USER_EMAIL, DEV_USER_ID } from "@/lib/dev-user";
import { getSession } from "@/lib/session";

export type AuthUser = {
  id: string;
  email: string;
  plan: "free" | "pro" | "team";
};

const DEV_USER: AuthUser = {
  id: DEV_USER_ID,
  email: DEV_USER_EMAIL,
  plan: "free",
};

/**
 * Resolves the signed-in user from the session cookie, if any. Returns null
 * when there is no session — callers decide whether that's an error (see
 * requireAuth).
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const session = await getSession();
    if (!session) return null;

    const row = await findUserById(session.userId);
    if (!row) return null;

    return { id: row.id, email: row.email, plan: row.plan as AuthUser["plan"] };
  } catch (e) {
    console.error("getAuthUser:", e);
    return null;
  }
}

/**
 * Guard for API routes: returns the signed-in user, or — for the Chrome
 * extension and standalone Express backend, which have no cross-origin
 * session mechanism yet — the seeded dev user, so those callers keep working.
 *
 * TODO(auth): once the extension/backend have real per-request auth, delete
 * the DEV_USER fallback below and uncomment the 401 response instead.
 */
export async function requireAuth(): Promise<AuthUser | Response> {
  const user = await getAuthUser();
  if (user) return user;

  return DEV_USER;
  // return new Response(JSON.stringify({ error: "Unauthorized" }), {
  //   status: 401,
  //   headers: { "Content-Type": "application/json" },
  // });
}
