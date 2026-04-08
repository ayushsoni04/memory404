import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseKey, getSupabaseUrl } from "./env";

/**
 * Server Components / Route Handlers: pass the cookie store from `await cookies()`.
 * Example:
 *   const cookieStore = await cookies()
 *   const supabase = createClient(cookieStore)
 */
export function createClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Component — middleware refreshes the session. */
        }
      },
    },
  });
}

/** Convenience for Route Handlers and async server code. */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}
