import type { LinkApiRow } from "@/lib/links";

export const GROUP_PILL_MIN_PX = 96;
export const GRID_SIZE_KEY = "memory404-grid-size";
export const OPENED_GROUP_COOKIE = "memory404-opened-group-id";
export const LINKS_PAGE_SIZE = 24;
/** Only poll metadata for recently-created pending links (avoids endless refetch). */
export const PENDING_POLL_MAX_AGE_MS = 10 * 60 * 1000;

export type LinksPage = {
  links: LinkApiRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type GridSize = "compact" | "default" | "large";

export const GRID_SIZES: { id: GridSize; label: string; title: string }[] = [
  { id: "compact", label: "S", title: "Compact grid" },
  { id: "default", label: "M", title: "Default grid" },
  { id: "large", label: "L", title: "Large grid" },
];

export type SortBy = "newest" | "oldest" | "domain" | "details" | "type";

export type GroupRow = {
  id: string;
  name: string;
  createdAt: string;
  linksCount: number;
  previewTitles: string[];
  sortOrder?: number;
};

export type InitialVaultData = {
  groups: GroupRow[];
  openedGroupId: string;
  firstPage: LinksPage;
};

export const FIELD_CLASS =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-[var(--duration-ui)] placeholder:text-subtle focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_35%,transparent)]";

/** Shared press + focus language for vault chrome controls. */
export const controlPress =
  "transition-[transform,background-color,border-color,color,box-shadow] duration-[var(--duration-press)] ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const pillBase = `inline-flex h-7 shrink-0 items-center rounded-full border border-transparent px-4 text-[13px] leading-none select-none cursor-pointer ${controlPress}`;

export const pillActive = `${pillBase} bg-pill-active text-pill-active-fg`;
export const pillIdle = `${pillBase} bg-pill text-muted hover:bg-pill-hover hover:text-foreground`;
