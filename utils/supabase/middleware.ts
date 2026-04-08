import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseKey, getSupabaseUrl } from "./env";

/**
 * Refreshes the auth session and forwards updated cookies on the response.
 * Call this from root `middleware.ts`.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
