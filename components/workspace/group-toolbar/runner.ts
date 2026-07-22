import type { ToolbarCase } from "./cases";
import type { ToolbarLabConfig } from "./defaults";

export type CaseStatus = "pass" | "fail" | "perf" | "manual" | "idle";

export type CaseResult = {
  id: string;
  status: CaseStatus;
  note: string;
};

function estimateActionsWidth(config: ToolbarLabConfig): number {
  let w = 0;
  if (config.showSort) w += 110;
  if (config.searchVisibility === "always" || config.searchVisibility === "sm") {
    w += config.searchWidth + 8;
  }
  if (config.showRefresh) w += 36;
  return w;
}

function estimatePillsMinWidth(config: ToolbarLabConfig): number {
  const label = (name: string) =>
    name.length * (config.pillFontSize * 0.62) + config.pillPadX * 2 + 20;
  const pills = config.groups.reduce((sum, g) => sum + label(g), 0);
  const gaps = Math.max(config.groups.length - 1, 0) * config.pillGap;
  const all = label("All") + (config.showSeparator ? 16 : 0);
  const add = config.showAddGroup ? config.pillHeight + 4 : 0;
  return all + pills + gaps + add;
}

export function runToolbarCase(
  c: ToolbarCase,
  config: ToolbarLabConfig,
): CaseResult {
  try {
    switch (c.id) {
      case "fps-drag-reorder": {
        if (!config.canReorder) {
          return {
            id: c.id,
            status: "pass",
            note: "Reorder off — no drag jank path",
          };
        }
        if (config.dragScale > 1.12 || config.dragDurationS > 0.5) {
          return {
            id: c.id,
            status: "perf",
            note: `Heavy drag (scale ${config.dragScale}, ${config.dragDurationS}s) — review FPS`,
          };
        }
        if (config.dragBounce > 0.25) {
          return {
            id: c.id,
            status: "perf",
            note: `Bounce ${config.dragBounce} may overshoot — tune ≤ 0.2`,
          };
        }
        return {
          id: c.id,
          status: "pass",
          note: "Drag spring within smooth budget",
        };
      }

      case "memory-stable-groups": {
        if (config.groups.length >= 8 && !config.pillsOverflowScroll) {
          return {
            id: c.id,
            status: "fail",
            note: "Many groups without overflow scroll — layout thrash risk",
          };
        }
        return {
          id: c.id,
          status: "pass",
          note: `${config.groups.length} groups; overflow=${config.pillsOverflowScroll}`,
        };
      }

      case "cpu-hover-transition": {
        if (config.hoverTransitionMs > 200) {
          return {
            id: c.id,
            status: "perf",
            note: `Hover ${config.hoverTransitionMs}ms is sluggish under load`,
          };
        }
        if (config.hoverTransitionMs < 80 && !config.flashSafe) {
          return {
            id: c.id,
            status: "fail",
            note: "Very fast hover + flashSafe off",
          };
        }
        return {
          id: c.id,
          status: "pass",
          note: `Hover ${config.hoverTransitionMs}ms OK`,
        };
      }

      case "device-phone-375": {
        const actions = estimateActionsWidth({
          ...config,
          searchVisibility:
            config.searchVisibility === "always"
              ? "always"
              : "hidden",
        });
        const pills = estimatePillsMinWidth(config);
        const free = 375 - 16 - actions;
        if (pills > free && !config.pillsOverflowScroll) {
          return {
            id: c.id,
            status: "fail",
            note: "Phone width: pills overflow without scroll",
          };
        }
        if (config.searchVisibility === "always" && config.searchWidth > 140) {
          return {
            id: c.id,
            status: "perf",
            note: "Always-on wide search crowds phone actions",
          };
        }
        return {
          id: c.id,
          status: "pass",
          note: "Phone layout heuristics OK",
        };
      }

      case "device-tablet-768": {
        const actions = estimateActionsWidth(config);
        if (actions > 320) {
          return {
            id: c.id,
            status: "perf",
            note: `Actions ~${Math.round(actions)}px — tight on tablet`,
          };
        }
        return { id: c.id, status: "pass", note: "Tablet chrome fits" };
      }

      case "device-desktop-1280": {
        if (config.rowGap < 8 || config.pillGap < 4) {
          return {
            id: c.id,
            status: "fail",
            note: "Gaps too tight for desktop density",
          };
        }
        return { id: c.id, status: "pass", note: "Desktop spacing OK" };
      }

      case "spacing-pill-gap": {
        if (config.pillGap < 4) {
          return { id: c.id, status: "fail", note: "Pill gap < 4px — collide" };
        }
        if (config.pillGap > 16) {
          return {
            id: c.id,
            status: "perf",
            note: "Pill gap > 16px — weak grouping",
          };
        }
        return {
          id: c.id,
          status: "pass",
          note: `pillGap=${config.pillGap}px`,
        };
      }

      case "spacing-row-gap": {
        if (config.rowGap < 8) {
          return {
            id: c.id,
            status: "fail",
            note: "Row gap < 8px — actions collide",
          };
        }
        if (config.rowGap > 24) {
          return {
            id: c.id,
            status: "perf",
            note: "Row gap > 24px — wasted space",
          };
        }
        return { id: c.id, status: "pass", note: `rowGap=${config.rowGap}px` };
      }

      case "spacing-pad-vertical": {
        if (config.padTop < 8 || config.padBottom < 8) {
          return {
            id: c.id,
            status: "fail",
            note: "Vertical pad < 8px — sticky clip risk",
          };
        }
        return {
          id: c.id,
          status: "pass",
          note: `pad ${config.padTop}/${config.padBottom}`,
        };
      }

      case "layout-no-clip-pills": {
        if (config.pillHeight > 40) {
          return {
            id: c.id,
            status: "fail",
            note: "Pill height > 40 may clip under sticky",
          };
        }
        if (config.groups.length > 6 && !config.pillsOverflowScroll) {
          return {
            id: c.id,
            status: "fail",
            note: "Need overflow scroll for long pill rows",
          };
        }
        return { id: c.id, status: "pass", note: "Clipping heuristics OK" };
      }

      case "layout-actions-visible": {
        if (
          config.searchVisibility !== "hidden" &&
          (config.searchWidth < 72 || config.searchWidth > 200)
        ) {
          return {
            id: c.id,
            status: "perf",
            note: `Search width ${config.searchWidth} outside 72–200`,
          };
        }
        if (!config.showSort && !config.showRefresh && config.searchVisibility === "hidden") {
          return {
            id: c.id,
            status: "fail",
            note: "All actions hidden — toolbar incomplete",
          };
        }
        return { id: c.id, status: "pass", note: "Actions reachable" };
      }

      case "layout-separator": {
        if (!config.showSeparator) {
          return {
            id: c.id,
            status: "perf",
            note: "Separator off — All vs folders less scannable",
          };
        }
        return { id: c.id, status: "pass", note: "Separator on" };
      }

      case "trigger-select-click": {
        if (config.selectMode !== "click") {
          return {
            id: c.id,
            status: "perf",
            note: "Hover select can misfire on scroll — prefer click",
          };
        }
        return { id: c.id, status: "pass", note: "Click select mode" };
      }

      case "trigger-reorder": {
        if (!config.canReorder) {
          return { id: c.id, status: "pass", note: "Reorder disabled" };
        }
        if (config.dragScale < 1 || config.dragScale > 1.12) {
          return {
            id: c.id,
            status: "fail",
            note: `dragScale ${config.dragScale} out of 1–1.12`,
          };
        }
        if (config.dragDurationS > 0.5) {
          return {
            id: c.id,
            status: "perf",
            note: "Drag duration > 0.5s feels laggy",
          };
        }
        return { id: c.id, status: "pass", note: "Reorder params OK" };
      }

      case "trigger-add-group": {
        if (!config.showAddGroup) {
          return {
            id: c.id,
            status: "perf",
            note: "Add group hidden — create flow unavailable",
          };
        }
        return { id: c.id, status: "pass", note: "Add group visible" };
      }

      case "trigger-delete": {
        // Always reachable in sandbox (hover or always)
        return {
          id: c.id,
          status: "pass",
          note: config.deleteOnHover
            ? "Delete on hover/focus"
            : "Delete always visible",
        };
      }

      case "interrupt-mid-drag": {
        if (config.canReorder && !config.respectReducedMotion) {
          return {
            id: c.id,
            status: "perf",
            note: "Without reduced-motion, mid-drag interrupt harder to cancel",
          };
        }
        if (config.canReorder && config.dragDurationS > 0.45) {
          return {
            id: c.id,
            status: "perf",
            note: "Long drag spring — interrupt feels sticky",
          };
        }
        return { id: c.id, status: "pass", note: "Interrupt path OK" };
      }

      case "interrupt-nav-away": {
        if (!config.flashSafe) {
          return {
            id: c.id,
            status: "fail",
            note: "flashSafe off — risk of orphaned pulse timers",
          };
        }
        return { id: c.id, status: "pass", note: "No flash loops" };
      }

      case "a11y-reduced-motion": {
        if (!config.respectReducedMotion) {
          return {
            id: c.id,
            status: "fail",
            note: "respectReducedMotion must be enabled",
          };
        }
        return { id: c.id, status: "pass", note: "Reduced motion honored" };
      }

      case "a11y-flash-safe": {
        if (!config.flashSafe) {
          return { id: c.id, status: "fail", note: "flashSafe disabled" };
        }
        if (config.hoverTransitionMs < 80) {
          return {
            id: c.id,
            status: "fail",
            note: "Hover < 80ms can strobe on rapid pointer move",
          };
        }
        return { id: c.id, status: "pass", note: "Below flash risk thresholds" };
      }

      case "a11y-press-feedback": {
        if (config.pressScale < 0.94 || config.pressScale > 1) {
          return {
            id: c.id,
            status: "fail",
            note: `pressScale ${config.pressScale} outside 0.94–1.0`,
          };
        }
        return {
          id: c.id,
          status: "pass",
          note: `pressScale=${config.pressScale}`,
        };
      }

      case "a11y-hit-targets": {
        if (config.pillHeight < 24) {
          return {
            id: c.id,
            status: "fail",
            note: "Pill height < 24px — poor tap targets",
          };
        }
        if (config.pillHeight < 28) {
          return {
            id: c.id,
            status: "perf",
            note: "Pill height < 28px — review on touch",
          };
        }
        return {
          id: c.id,
          status: "pass",
          note: `pillHeight=${config.pillHeight}px`,
        };
      }

      default:
        return {
          id: c.id,
          status: c.expect === "manual" ? "manual" : "pass",
          note: "No heuristic — manual review",
        };
    }
  } catch (e) {
    return {
      id: c.id,
      status: "fail",
      note: e instanceof Error ? e.message : "Runner crashed",
    };
  }
}
