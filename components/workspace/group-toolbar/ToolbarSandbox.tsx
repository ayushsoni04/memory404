"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, RotateCw, X } from "lucide-react";
import type { ToolbarLabConfig } from "./defaults";

type Props = {
  config: ToolbarLabConfig;
  onChange: (patch: Partial<ToolbarLabConfig>) => void;
  width: number | null;
  label: string;
};

export function ToolbarSandbox({ config, onChange, width, label }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [order, setOrder] = useState(config.groups);
  const orderRef = useRef(order);
  const [osReducedMotion, setOsReducedMotion] = useState(false);

  useEffect(() => {
    setOrder(config.groups);
    orderRef.current = config.groups;
  }, [config.groups]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setOsReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const reduceMotion = config.respectReducedMotion && osReducedMotion;

  const searchClass =
    config.searchVisibility === "hidden"
      ? "hidden"
      : config.searchVisibility === "always"
        ? "block"
        : config.searchVisibility === "sm"
          ? "hidden sm:block"
          : "hidden md:block";

  const pillStyle = {
    height: config.pillHeight,
    paddingLeft: config.pillPadX,
    paddingRight: config.pillPadX,
    borderRadius: config.pillRadius,
    fontSize: config.pillFontSize,
  } as const;

  const onPillDragStart = (name: string) => {
    if (!config.canReorder) return;
    setDragging(name);
  };

  const onPillDragOver = (e: React.DragEvent, overName: string) => {
    if (!config.canReorder || !dragging || dragging === overName) return;
    e.preventDefault();
    setOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(dragging);
      const to = next.indexOf(overName);
      if (from < 0 || to < 0) return prev;
      next.splice(from, 1);
      next.splice(to, 0, dragging);
      orderRef.current = next;
      return next;
    });
  };

  const onPillDragEnd = () => {
    setDragging(null);
    onChange({ groups: orderRef.current });
  };

  const effectiveDragScale = reduceMotion ? 1 : config.dragScale;
  const transitionMs = reduceMotion ? 0 : config.hoverTransitionMs;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">
          {label}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-subtle">
          {width ? `${width}px` : "100%"}
        </span>
      </div>
      <div
        className="overflow-hidden rounded-[4px] border border-border bg-background"
        style={{ width: width ?? "100%", maxWidth: "100%" }}
      >
        <div
          className={`flex items-center justify-between bg-background pr-4 ${
            config.sticky ? "sticky top-0 z-10" : ""
          } ${config.flashSafe ? "" : "animate-pulse"}`}
          style={{
            paddingTop: config.padTop,
            paddingBottom: config.padBottom,
            gap: config.rowGap,
          }}
        >
          <div
            className={`relative flex min-w-0 flex-1 items-center ${
              config.pillsOverflowScroll
                ? "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                : "overflow-x-visible"
            }`}
          >
            <button
              type="button"
              onClick={() => onChange({ active: "all" })}
              onMouseEnter={() => {
                if (config.selectMode === "hover") onChange({ active: "all" });
              }}
              className={`inline-flex shrink-0 items-center border border-transparent leading-none select-none ${
                config.active === "all"
                  ? "bg-pill-active text-pill-active-fg"
                  : "bg-pill text-muted hover:bg-pill-hover"
              }`}
              style={{
                ...pillStyle,
                transition: `background-color ${transitionMs}ms var(--ease-out), color ${transitionMs}ms var(--ease-out), transform ${transitionMs}ms var(--ease-out)`,
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  reduceMotion ? "" : `scale(${config.pressScale})`;
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "";
              }}
            >
              All
            </button>
            {config.showSeparator ? (
              <span aria-hidden className="mx-2 h-5 w-px shrink-0 bg-border" />
            ) : (
              <span aria-hidden className="mx-1 shrink-0" />
            )}

            <div
              className="flex min-w-0 items-center"
              style={{ gap: config.pillGap }}
            >
              {order.map((name) => {
                const active = config.active === name;
                const isDragging = dragging === name;
                return (
                  <div
                    key={name}
                    draggable={config.canReorder && !reduceMotion}
                    onDragStart={() => onPillDragStart(name)}
                    onDragOver={(e) => onPillDragOver(e, name)}
                    onDragEnd={onPillDragEnd}
                    className="group/pill shrink-0"
                    style={{
                      transform:
                        isDragging && config.canReorder
                          ? `scale(${effectiveDragScale})`
                          : undefined,
                      boxShadow: isDragging
                        ? "0 4px 12px rgba(0,0,0,0.2)"
                        : undefined,
                      transition: `transform ${config.dragDurationS}s cubic-bezier(0.34, 1.4, 0.64, 1)`,
                      cursor: config.canReorder ? "grab" : "default",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (config.selectMode === "click") {
                          onChange({ active: name });
                        }
                      }}
                      onMouseEnter={() => {
                        if (config.selectMode === "hover") {
                          onChange({ active: name });
                        }
                      }}
                      className={`inline-flex items-center border border-transparent leading-none select-none ${
                        active
                          ? "bg-pill-active text-pill-active-fg"
                          : "bg-pill text-muted hover:bg-pill-hover"
                      }`}
                      style={{
                        ...pillStyle,
                        paddingRight: Math.max(config.pillPadX - 8, 4),
                        transition: `background-color ${transitionMs}ms var(--ease-out), color ${transitionMs}ms var(--ease-out), transform ${transitionMs}ms var(--ease-out)`,
                      }}
                      onMouseDown={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                          reduceMotion ? "" : `scale(${config.pressScale})`;
                      }}
                      onMouseUp={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                          "";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                          "";
                      }}
                    >
                      <span className="pr-1">{name}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Remove ${name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = config.groups.filter((g) => g !== name);
                          onChange({
                            groups: next,
                            active:
                              config.active === name ? "all" : config.active,
                          });
                        }}
                        className={`ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-400 cursor-pointer ${
                          config.deleteOnHover
                            ? "opacity-0 group-hover/pill:opacity-100 focus-visible:opacity-100"
                            : "opacity-100"
                        }`}
                      >
                        <X className="size-2.5" />
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {config.showAddGroup ? (
              <button
                type="button"
                aria-label="Add group"
                className="ml-1 inline-flex shrink-0 items-center justify-center border border-dashed border-muted/50 bg-transparent text-muted transition-colors hover:border-foreground/35 hover:text-foreground"
                style={{
                  width: config.pillHeight,
                  height: config.pillHeight,
                  borderRadius: config.pillRadius,
                  transition: `border-color ${transitionMs}ms var(--ease-out), color ${transitionMs}ms var(--ease-out)`,
                }}
                onClick={() => {
                  const next = `group ${config.groups.length + 1}`;
                  onChange({ groups: [...config.groups, next], active: next });
                }}
              >
                <Plus className="size-3.5" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {config.showSort ? (
              <select
                value={config.sortBy}
                onChange={(e) =>
                  onChange({
                    sortBy: e.target.value as ToolbarLabConfig["sortBy"],
                  })
                }
                aria-label="Sort links"
                className="border border-border bg-surface px-2.5 text-[12px] font-medium text-muted outline-none focus:border-border-strong hover:text-foreground cursor-pointer"
                style={{
                  height: config.controlHeight,
                  borderRadius: config.pillRadius,
                }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="domain">Domain</option>
                <option value="type">Link Type</option>
                <option value="details">Details Size</option>
              </select>
            ) : null}

            {config.searchVisibility !== "hidden" ? (
              <input
                type="search"
                value={config.search}
                onChange={(e) => onChange({ search: e.target.value })}
                placeholder="Search"
                className={`${searchClass} border border-border bg-surface px-2.5 text-[13px] text-foreground outline-none focus:border-border-strong`}
                style={{
                  height: config.controlHeight,
                  width: config.searchWidth,
                  borderRadius: config.pillRadius,
                }}
              />
            ) : null}

            {config.showRefresh ? (
              <button
                type="button"
                aria-label="Refresh"
                className="inline-flex items-center justify-center border border-transparent bg-pill px-2 text-muted hover:bg-pill-hover"
                style={{
                  height: config.controlHeight,
                  borderRadius: config.pillRadius,
                }}
              >
                <RotateCw
                  className="size-3.5 -scale-x-100"
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
