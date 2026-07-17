import { prisma } from "@/lib/prisma";
import { DEV_USER_EMAIL, DEV_USER_ID } from "@/lib/dev-user";
import { getSupabaseEnvError } from "@/lib/supabase-config";
import { createServerSupabase } from "@/utils/supabase/server";

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
 * Resolves the signed-in Supabase user, if any, upserting a matching `User`
 * row so foreign keys on Link/Group resolve. Returns null when there is no
 * session — callers decide whether that's an error (see requireAuth).
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  if (getSupabaseEnvError()) return null;

  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return null;

    const row = await prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email },
      update: { email: user.email },
      select: { id: true, email: true, plan: true },
    });

    return { id: row.id, email: row.email, plan: row.plan as AuthUser["plan"] };
  } catch (e) {
    console.error("getAuthUser:", e);
    return null;
  }
}

/**
 * Guard for API routes: returns the signed-in user, or — until real sign-in
 * ships — the seeded dev user, so every route keeps working for everyone.
 *
 * TODO(auth): once a sign-in flow exists, delete the DEV_USER fallback below
 * and uncomment the 401 response instead.
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
