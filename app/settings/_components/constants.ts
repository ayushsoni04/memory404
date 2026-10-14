export const BANNER_GRADIENTS = [
  { id: "midnight", label: "Midnight Onyx", class: "bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-border" },
  { id: "aurora", label: "Aurora Teal", class: "bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-b border-emerald-900/30" },
  { id: "twilight", label: "Twilight Violet", class: "bg-gradient-to-r from-indigo-950 via-rose-950 to-indigo-950 border-b border-rose-950/30" },
  { id: "ocean", label: "Deep Ocean", class: "bg-gradient-to-r from-sky-950 via-blue-900 to-sky-950 border-b border-blue-900/30" },
];

export type Tab = "profile" | "statistics";

/** Profile, or Stats when the URL asks for it. Retired tabs, including membership, land on Profile. */
export function resolveSettingsTab(value: string | null | undefined): Tab {
  if (value === "statistics") return "statistics";
  return "profile";
}

type SearchParam = string | string[] | undefined;

export function firstSearchParam(value: SearchParam): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * `/settings?tab=membership` no longer has a screen. Drop that param and
 * keep the rest of the query so the address bar opens Profile.
 */
export function settingsHrefWithoutRetiredTab(
  tab: string | null,
  params: Record<string, SearchParam>,
): string | null {
  if (tab !== "membership") return null;
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "tab" || value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) next.append(key, item);
    } else {
      next.set(key, value);
    }
  }
  const qs = next.toString();
  return qs ? `/settings?${qs}` : "/settings";
}
