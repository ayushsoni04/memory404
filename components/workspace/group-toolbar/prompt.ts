import {
  CONFIG_LABELS,
  DEFAULT_TOOLBAR_CONFIG,
  type ToolbarLabConfig,
} from "./defaults";

export type ConfigDiff = {
  key: keyof ToolbarLabConfig;
  label: string;
  from: string;
  to: string;
};

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

export function diffToolbarConfig(config: ToolbarLabConfig): ConfigDiff[] {
  const diffs: ConfigDiff[] = [];
  (Object.keys(DEFAULT_TOOLBAR_CONFIG) as (keyof ToolbarLabConfig)[]).forEach(
    (key) => {
      const from = DEFAULT_TOOLBAR_CONFIG[key];
      const to = config[key];
      const same =
        Array.isArray(from) && Array.isArray(to)
          ? JSON.stringify(from) === JSON.stringify(to)
          : from === to;
      if (same) return;
      diffs.push({
        key,
        label: CONFIG_LABELS[key],
        from: formatValue(from),
        to: formatValue(to),
      });
    },
  );
  return diffs;
}

export function buildDevPrompt(config: ToolbarLabConfig): string {
  const diffs = diffToolbarConfig(config);
  if (diffs.length === 0) {
    return [
      "## VaultGroupToolbar change request",
      "",
      "No sandbox values differ from production defaults.",
      "File: `components/vault/VaultGroupToolbar.tsx`",
    ].join("\n");
  }

  const lines = [
    "## VaultGroupToolbar change request",
    "",
    "Apply these sandbox tweaks to the production toolbar.",
    "",
    "**Files**",
    "- `components/vault/VaultGroupToolbar.tsx`",
    "- `components/vault/types.ts` (pill classes if radius/padding change)",
    "- `app/globals.css` only if new tokens are needed",
    "",
    "**Changed values** (sandbox vs current production defaults)",
    "",
  ];

  for (const d of diffs) {
    lines.push(`- \`${d.key}\` (${d.label}): \`${d.from}\` → \`${d.to}\``);
  }

  lines.push(
    "",
    "**Interaction notes**",
    `- Drag reorder: ${config.canReorder ? "enabled" : "disabled"}`,
    `- Select mode: ${config.selectMode}`,
    `- Delete control: ${config.deleteOnHover ? "hover/focus only" : "always visible"}`,
    `- Sticky: ${config.sticky}`,
    `- Pills overflow scroll: ${config.pillsOverflowScroll}`,
    `- Separator: ${config.showSeparator}`,
    `- Add group: ${config.showAddGroup}`,
    `- Hover transition: ${config.hoverTransitionMs}ms`,
    `- Drag spring: ${config.dragDurationS}s bounce ${config.dragBounce}`,
    `- Press scale: ${config.pressScale}`,
    `- Respect reduced motion: ${config.respectReducedMotion}`,
    `- Flash-safe: ${config.flashSafe}`,
    `- Search: ${config.searchVisibility}`,
    `- Sort: ${config.showSort ? "visible" : "hidden"}`,
    `- Refresh: ${config.showRefresh ? "visible" : "hidden"}`,
    "",
    "Keep Framer Reorder structure unless a listed change requires otherwise.",
    "Match existing motion tokens (`--ease-out`, 150–160ms UI). Prefer `rounded-[4px]` over full pills if radius was reduced.",
  );

  return lines.join("\n");
}
