export type ToolbarCaseTag =
  | "PERFORMANCE"
  | "LAYOUT"
  | "SPACING"
  | "FUNCTIONAL"
  | "INTERRUPTION"
  | "A11Y"
  | "STRESS"
  | "DEVICE";

export type ToolbarCase = {
  id: string;
  title: string;
  description: string;
  tags: ToolbarCaseTag[];
  /** Heuristic expectation for the lab runner */
  expect: "pass" | "perf" | "manual";
  category:
    | "performance"
    | "visual"
    | "functional"
    | "accessibility";
};

export const TOOLBAR_CASE_FILTERS = [
  "FAILING ONLY",
  "PERFORMANCE",
  "LAYOUT",
  "SPACING",
  "FUNCTIONAL",
  "INTERRUPTION",
  "A11Y",
  "STRESS",
  "DEVICE",
] as const;

export type ToolbarCaseFilter = (typeof TOOLBAR_CASE_FILTERS)[number];

export const TOOLBAR_CASES: ToolbarCase[] = [
  // —— Performance ——
  {
    id: "fps-drag-reorder",
    title: "Frame rate during drag reorder",
    description:
      "Drag should stay near 60/120fps — no jank from oversized spring or dragScale > 1.12.",
    tags: ["PERFORMANCE", "STRESS"],
    expect: "perf",
    category: "performance",
  },
  {
    id: "memory-stable-groups",
    title: "Memory stable with many groups",
    description:
      "Long pill lists should not imply leaked listeners; overflow scroll required when many groups.",
    tags: ["PERFORMANCE", "STRESS"],
    expect: "pass",
    category: "performance",
  },
  {
    id: "cpu-hover-transition",
    title: "CPU-friendly hover transitions",
    description:
      "Hover transition ≤ 200ms and only color/transform — no multi-layer shadows pulsing.",
    tags: ["PERFORMANCE"],
    expect: "pass",
    category: "performance",
  },
  {
    id: "device-phone-375",
    title: "Phone 375 layout",
    description:
      "At 375px, search may hide (≥sm); pills row must scroll; actions must not crush pills.",
    tags: ["DEVICE", "LAYOUT"],
    expect: "pass",
    category: "visual",
  },
  {
    id: "device-tablet-768",
    title: "Tablet 768 layout",
    description:
      "At 768px, sort + search (≥sm) fit without clipping refresh.",
    tags: ["DEVICE", "LAYOUT"],
    expect: "pass",
    category: "visual",
  },
  {
    id: "device-desktop-1280",
    title: "Desktop 1280 layout",
    description: "Full chrome visible; row gap and pill gap remain readable.",
    tags: ["DEVICE", "LAYOUT"],
    expect: "pass",
    category: "visual",
  },

  // —— Visual / spacing ——
  {
    id: "spacing-pill-gap",
    title: "Pill gap spacing",
    description: "Pill gap between 4–16px — tight enough to scan, not colliding.",
    tags: ["SPACING", "LAYOUT"],
    expect: "pass",
    category: "visual",
  },
  {
    id: "spacing-row-gap",
    title: "Row gap (pills ↔ actions)",
    description: "Row gap 8–24px so actions don’t collide with last pill.",
    tags: ["SPACING", "LAYOUT"],
    expect: "pass",
    category: "visual",
  },
  {
    id: "spacing-pad-vertical",
    title: "Vertical padding",
    description: "Top/bottom pad ≥ 8px so sticky bar doesn’t clip pill shadows.",
    tags: ["SPACING", "LAYOUT"],
    expect: "pass",
    category: "visual",
  },
  {
    id: "layout-no-clip-pills",
    title: "Pills not clipped",
    description:
      "Overflow scroll on when groups are many; pill height ≤ 40px to avoid sticky overflow.",
    tags: ["LAYOUT"],
    expect: "pass",
    category: "visual",
  },
  {
    id: "layout-actions-visible",
    title: "Actions not hidden",
    description:
      "Sort/search/refresh remain reachable; search width 72–200 when visible.",
    tags: ["LAYOUT", "FUNCTIONAL"],
    expect: "pass",
    category: "visual",
  },
  {
    id: "layout-separator",
    title: "All / folders separator",
    description: "Separator present between All and folder pills when enabled.",
    tags: ["LAYOUT"],
    expect: "pass",
    category: "visual",
  },

  // —— Functional / interruption ——
  {
    id: "trigger-select-click",
    title: "Select on click",
    description: "Click mode must activate groups without hover-only traps.",
    tags: ["FUNCTIONAL"],
    expect: "pass",
    category: "functional",
  },
  {
    id: "trigger-reorder",
    title: "Reorder start/stop",
    description:
      "When reorder is on, dragScale 1–1.12 and duration ≤ 0.5s so start/stop feel snappy.",
    tags: ["FUNCTIONAL", "PERFORMANCE"],
    expect: "pass",
    category: "functional",
  },
  {
    id: "trigger-add-group",
    title: "Add group control",
    description: "Add (+) visible when showAddGroup; can create next group.",
    tags: ["FUNCTIONAL"],
    expect: "pass",
    category: "functional",
  },
  {
    id: "trigger-delete",
    title: "Delete affordance",
    description:
      "Delete × reachable — hover-only is OK if keyboard-focusable; always-visible also OK.",
    tags: ["FUNCTIONAL", "A11Y"],
    expect: "pass",
    category: "functional",
  },
  {
    id: "interrupt-mid-drag",
    title: "Interrupt mid-drag",
    description:
      "Leaving mid-reorder must not freeze UI — respectReducedMotion + bounded drag spring.",
    tags: ["INTERRUPTION", "FUNCTIONAL"],
    expect: "pass",
    category: "functional",
  },
  {
    id: "interrupt-nav-away",
    title: "Navigate away mid-interaction",
    description:
      "No infinite timers/flash loops (flashSafe) so unmount mid-hover is clean.",
    tags: ["INTERRUPTION"],
    expect: "pass",
    category: "functional",
  },

  // —— Accessibility ——
  {
    id: "a11y-reduced-motion",
    title: "prefers-reduced-motion",
    description:
      "respectReducedMotion must be on so drag scale/spring simplify under OS setting.",
    tags: ["A11Y"],
    expect: "pass",
    category: "accessibility",
  },
  {
    id: "a11y-flash-safe",
    title: "No seizure-risk flashing",
    description:
      "flashSafe on; hoverTransitionMs ≥ 80; no rapid color strobe on pills.",
    tags: ["A11Y"],
    expect: "pass",
    category: "accessibility",
  },
  {
    id: "a11y-press-feedback",
    title: "Press feedback",
    description: "pressScale in 0.94–1.0 range for tactile press without jump.",
    tags: ["A11Y", "FUNCTIONAL"],
    expect: "pass",
    category: "accessibility",
  },
  {
    id: "a11y-hit-targets",
    title: "Hit target size",
    description: "Pill height ≥ 28px (or ≥ 24 with pad) for usable taps.",
    tags: ["A11Y", "SPACING"],
    expect: "pass",
    category: "accessibility",
  },
];
