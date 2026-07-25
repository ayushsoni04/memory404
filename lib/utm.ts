import type { UserUtm } from "@/lib/db/types";

/** Reads utm_source/medium/campaign off the current URL, if present. */
export function readUtmFromSearchParams(
  searchParams: { get(key: string): string | null },
): UserUtm | undefined {
  const source = searchParams.get("utm_source") ?? undefined;
  const medium = searchParams.get("utm_medium") ?? undefined;
  const campaign = searchParams.get("utm_campaign") ?? undefined;
  if (!source && !medium && !campaign) return undefined;
  return { source, medium, campaign };
}

export const LEAD_SOURCE_OPTIONS = [
  { value: "search", label: "Search engine" },
  { value: "twitter_x", label: "Twitter / X" },
  { value: "friend_colleague", label: "Friend or colleague" },
  { value: "blog_article", label: "Blog or article" },
  { value: "other", label: "Other" },
] as const;
