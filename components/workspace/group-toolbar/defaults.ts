export type SortBy = "newest" | "oldest" | "domain" | "details" | "type";

export type SearchVisibility = "always" | "sm" | "md" | "hidden";

export type ViewportId = "phone" | "tablet" | "laptop" | "desktop" | "fluid";

export type SelectMode = "click" | "hover";

export type ToolbarLabConfig = {
  /** Outer toolbar padding top (px) — production `pt-3` = 12 */
  padTop: number;
  /** Outer toolbar padding bottom (px) — production `pb-4` = 16 */
  padBottom: number;
  /** Gap between pills row and actions (px) — production `gap-4` = 16 */
  rowGap: number;
  /** Gap between group pills (px) — production `gap-2` = 8 */
  pillGap: number;
  /** Pill height (px) — production `h-7` = 28 */
  pillHeight: number;
  /** Horizontal pill padding (px) — production `px-4` = 16 */
  pillPadX: number;
  /** Pill corner radius (px) — production full = 999 */
  pillRadius: number;
  /** Pill font size (px) — production `text-[13px]` */
  pillFontSize: number;
  /** Sort/search/refresh control height (px) */
  controlHeight: number;
  /** Search field width (px) — production `w-28` = 112 */
  searchWidth: number;
  /** Allow drag reorder */
  canReorder: boolean;
  /** Delete × only on hover (production) vs always visible */
  deleteOnHover: boolean;
  /** Drag scale — production 1.03 */
  dragScale: number;
  /** Show sort select */
  showSort: boolean;
  /** Search visibility */
  searchVisibility: SearchVisibility;
  /** Show refresh button */
  showRefresh: boolean;
  /** Sample group names (excluding All) */
  groups: string[];
  /** Active selection: "all" or group name */
  active: string;
  sortBy: SortBy;
  search: string;

  // —— Interactions ——
  /** Sticky toolbar shell */
  sticky: boolean;
  /** Horizontal overflow scroll on pills row */
  pillsOverflowScroll: boolean;
  /** Show All | folders separator */
  showSeparator: boolean;
  /** Show + add group control */
  showAddGroup: boolean;
  /** Select group on click vs hover */
  selectMode: SelectMode;
  /** Color/hover transition duration (ms) */
  hoverTransitionMs: number;
  /** Drag spring duration (s) — production 0.35 */
  dragDurationS: number;
  /** Drag spring bounce — production 0.12 */
  dragBounce: number;
  /** Press scale on pill active */
  pressScale: number;
  /** Honor prefers-reduced-motion (disable drag scale / motion) */
  respectReducedMotion: boolean;
  /** Avoid rapid flash/pulse affordances */
  flashSafe: boolean;
};

export const VIEWPORTS: {
  id: ViewportId;
  label: string;
  width: number | null;
}[] = [
  { id: "phone", label: "Phone", width: 375 },
  { id: "tablet", label: "Tablet", width: 768 },
  { id: "laptop", label: "Laptop", width: 1024 },
  { id: "desktop", label: "Desktop", width: 1280 },
  { id: "fluid", label: "Fluid", width: null },
];

export const DEFAULT_TOOLBAR_CONFIG: ToolbarLabConfig = {
  padTop: 12,
  padBottom: 16,
  rowGap: 16,
  pillGap: 8,
  pillHeight: 28,
  pillPadX: 16,
  pillRadius: 999,
  pillFontSize: 13,
  controlHeight: 28,
  searchWidth: 112,
  canReorder: true,
  deleteOnHover: true,
  dragScale: 1.03,
  showSort: true,
  searchVisibility: "sm",
  showRefresh: true,
  groups: [
    "design",
    "learn",
    "website",
    "design system",
    "three js",
    "dream project",
    "interface anatomy",
    "books",
  ],
  active: "all",
  sortBy: "newest",
  search: "",
  sticky: true,
  pillsOverflowScroll: true,
  showSeparator: true,
  showAddGroup: true,
  selectMode: "click",
  hoverTransitionMs: 150,
  dragDurationS: 0.35,
  dragBounce: 0.12,
  pressScale: 0.97,
  respectReducedMotion: true,
  flashSafe: true,
};

export const CONFIG_LABELS: Record<keyof ToolbarLabConfig, string> = {
  padTop: "Toolbar padding top",
  padBottom: "Toolbar padding bottom",
  rowGap: "Row gap (pills ↔ actions)",
  pillGap: "Pill gap",
  pillHeight: "Pill height",
  pillPadX: "Pill horizontal padding",
  pillRadius: "Pill corner radius",
  pillFontSize: "Pill font size",
  controlHeight: "Control height",
  searchWidth: "Search width",
  canReorder: "Allow drag reorder",
  deleteOnHover: "Delete only on hover",
  dragScale: "Drag scale",
  showSort: "Show sort select",
  searchVisibility: "Search visibility",
  showRefresh: "Show refresh",
  groups: "Group names",
  active: "Active group",
  sortBy: "Sort value",
  search: "Search value",
  sticky: "Sticky toolbar",
  pillsOverflowScroll: "Pills overflow scroll",
  showSeparator: "All / folders separator",
  showAddGroup: "Add group button",
  selectMode: "Select mode",
  hoverTransitionMs: "Hover transition (ms)",
  dragDurationS: "Drag duration (s)",
  dragBounce: "Drag bounce",
  pressScale: "Press scale",
  respectReducedMotion: "Respect reduced motion",
  flashSafe: "Flash-safe (no rapid pulse)",
};

export const GROUP_TOOLBAR_LAB_VERSION = "v0.2.0";
