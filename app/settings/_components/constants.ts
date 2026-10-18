export const BANNER_GRADIENTS = [
  { id: "midnight", label: "Midnight Onyx", class: "bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-border" },
  { id: "aurora", label: "Aurora Teal", class: "bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-b border-emerald-900/30" },
  { id: "twilight", label: "Twilight Violet", class: "bg-gradient-to-r from-indigo-950 via-rose-950 to-indigo-950 border-b border-rose-950/30" },
  { id: "ocean", label: "Deep Ocean", class: "bg-gradient-to-r from-sky-950 via-blue-900 to-sky-950 border-b border-blue-900/30" },
];

const BANNER_IDS = BANNER_GRADIENTS.map((banner) => banner.id);

/** Next profile banner. Stops at the ends. */
export function nextBannerStyle(current: string, key: string): string | null {
  const index = BANNER_IDS.indexOf(current);
  if (index < 0) return null;
  let next = index;
  if (key === "Home") next = 0;
  else if (key === "End") next = BANNER_IDS.length - 1;
  else if (key === "ArrowRight" || key === "ArrowDown") next = index + 1;
  else if (key === "ArrowLeft" || key === "ArrowUp") next = index - 1;
  else return null;
  if (next < 0 || next >= BANNER_IDS.length || next === index) return null;
  return BANNER_IDS[next] ?? null;
}

export type Tab = "profile" | "statistics";

export const SETTINGS_TABS: readonly Tab[] = ["profile", "statistics"];

/** Next settings tab for a vertical or horizontal tab list. Stops at the ends. */
export function nextSettingsTab(current: Tab, key: string): Tab | null {
  const index = SETTINGS_TABS.indexOf(current);
  if (index < 0) return null;
  let next = index;
  if (key === "Home") next = 0;
  else if (key === "End") next = SETTINGS_TABS.length - 1;
  else if (key === "ArrowDown" || key === "ArrowRight") next = index + 1;
  else if (key === "ArrowUp" || key === "ArrowLeft") next = index - 1;
  else return null;
  if (next < 0 || next >= SETTINGS_TABS.length || next === index) return null;
  return SETTINGS_TABS[next];
}

/** Profile, or Stats when the URL asks for it. Retired tabs, including membership, land on Profile. */
export function resolveSettingsTab(value: string | null | undefined): Tab {
  if (value === "statistics") return "statistics";
  return "profile";
}

/**
 * Address for the section the user just opened. Profile drops `tab`.
 * Other query params and the hash stay, so a refresh opens the same screen.
 */
export function settingsTabHref(currentHref: string, tab: Tab): string {
  const url = new URL(currentHref, "http://localhost");
  if (tab === "profile") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  const qs = url.searchParams.toString();
  return `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
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
