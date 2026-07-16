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
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-border-strong focus:ring-1 focus:ring-foreground/20";

const pillBase =
  "inline-flex h-7 shrink-0 items-center rounded-full border border-transparent px-4 text-[13px] leading-none transition-colors select-none";

export const pillActive = `${pillBase} bg-pill-active text-pill-active-fg`;
export const pillIdle = `${pillBase} bg-pill text-muted hover:bg-pill-hover`;
