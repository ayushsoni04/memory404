"use client";

import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { Check, FolderInput, Trash2 } from "lucide-react";

type GroupOption = { id: string; name: string };

type Props = {
  groups: GroupOption[];
  currentGroupId: string;
  currentGroupName: string | null;
  onMove: (groupId: string) => void;
  onTrash: () => void;
  trashing: boolean;
  focusClass: string;
};

const ICON_BTN =
  "relative inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-black/25 text-muted transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50 sm:size-10";

/**
 * Bottom action row for the link detail panel: an "Add to group" button that
 * opens a group list above it, and Move to Trash.
 */
const DetailActionBar = forwardRef<HTMLButtonElement, Props>(function DetailActionBar(
  { groups, currentGroupId, currentGroupName, onMove, onTrash, trashing, focusClass },
  trashRef,
) {
  const [open, setOpen] = useState(false);
  const trashHintId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const current = groups.findIndex((g) => g.id === currentGroupId);
    itemRefs.current[current >= 0 ? current : 0]?.focus();

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    // Capture on window runs before the overlay's own Escape handler, so
    // Escape closes this menu without also closing the detail view.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, groups, currentGroupId]);

  const moveFocus = (from: number, delta: number) => {
    const count = groups.length;
    if (!count) return;
    itemRefs.current[(from + delta + count) % count]?.focus();
  };

  const groupLabel = currentGroupName ? `In ${currentGroupName}` : "Add to group";

  return (
    <div
      ref={rootRef}
      className="relative mt-5 flex items-center justify-center gap-2 border-t border-white/10 pt-4"
    >
      <button
        ref={toggleRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${groupLabel}. Change group`}
        title={groupLabel}
        onClick={() => setOpen((v) => !v)}
        className={`${ICON_BTN} ${open ? "bg-white/10 text-foreground" : ""} ${focusClass}`}
      >
        <FolderInput className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </button>

      <button
        ref={trashRef}
        type="button"
        onClick={onTrash}
        disabled={trashing}
        aria-busy={trashing}
        aria-label="Move to Trash"
        aria-describedby={trashHintId}
        title={trashing ? "Moving…" : "Move to Trash"}
        className={`${ICON_BTN} hover:border-danger/40 hover:bg-danger/10 hover:text-danger ${focusClass}`}
      >
        <Trash2 className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </button>
      <span id={trashHintId} className="sr-only">
        You can restore it from Trash for 30 days.
      </span>

      {open ? (
        <div
          role="menu"
          aria-label="Move to group"
          className="menu-pop absolute bottom-[calc(100%-0.5rem)] left-1/2 z-20 w-60 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-[6px] border border-white/10 bg-surface-elevated p-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-subtle">Move to group</p>
          <div className="max-h-64 overflow-y-auto [scrollbar-width:thin]">
            {groups.map((g, i) => {
              const current = g.id === currentGroupId;
              return (
                <button
                  key={g.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={current}
                  onClick={() => {
                    setOpen(false);
                    if (!current) onMove(g.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      moveFocus(i, 1);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      moveFocus(i, -1);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-[4px] px-2.5 py-2 text-left text-[13px] text-muted outline-none hover:bg-white/8 hover:text-foreground focus-visible:bg-white/10 focus-visible:text-foreground"
                >
                  <span className="min-w-0 flex-1 truncate" title={g.name}>
                    {g.name}
                  </span>
                  {current ? (
                    <Check className="size-4 shrink-0 text-foreground" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default DetailActionBar;
