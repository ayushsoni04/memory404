import { getSupabaseKey, getSupabaseUrl } from "@/utils/supabase/env";

/**
 * Returns a user-facing message if Supabase env is missing or still a template.
 */
export function getSupabaseEnvError(): string | null {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) {
    return "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local, then restart the dev server.";
  }

  const looksLikePlaceholder =
    /your_supabase|placeholder|example\.com/i.test(url) ||
    /your_supabase|placeholder/i.test(key);

  if (looksLikePlaceholder) {
    return "Replace placeholder values in .env.local with your real Supabase URL and publishable (or anon) key from the dashboard, then restart npm run dev.";
  }

  if (!url.startsWith("https://")) {
    return "NEXT_PUBLIC_SUPABASE_URL must be your full https://… project URL from Supabase.";
  }

  return null;
}
