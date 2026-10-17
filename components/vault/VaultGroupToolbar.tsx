"use client";

import { useEffect, useRef, useState } from "react";
import { horizontalScrollEdges } from "./pill-scroll-fade";
import { Check, ChevronDown, Plus, RotateCw, Search, X } from "lucide-react";
import { Reorder } from "framer-motion";
import { AppLoader } from "@/components/AppLoader";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { groupNameDraftIssue } from "@/lib/group-name";
import { playUiSound } from "@/lib/ui-sound";
import { nextOptionIndex } from "./feed-keyboard";
import { activeGroupPill, groupPillIds, nextGroupPill } from "./group-pills";
import {
  controlPress,
  pillActive,
  pillIdle,
  type GroupRow,
  type SortBy,
} from "./types";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "domain", label: "Domain" },
  { value: "type", label: "Link Type" },
  { value: "details", label: "Details Size" },
];

type VaultGroupToolbarProps = {
  openedGroupId: string | null;
  selectGroup: (id: string) => void;
  generalGroup: GroupRow | null;
  filteredFolders: GroupRow[];
  draggingGroupId: string | null;
  setDraggingGroupId: (id: string | null) => void;
  persistFolderOrder: (orderedFolders: GroupRow[]) => void;
  canReorderPills: boolean;
  handleDeleteGroup: (groupId: string) => void;
  addingAt: number | null;
  createGroupName: string;
  setCreateGroupName: (value: string) => void;
  creatingGroup: boolean;
  createGroupError: string | null;
  setCreateGroupError: (value: string | null) => void;
  createGroup: () => Promise<void>;
  openAddGroup: (at: number) => void;
  cancelAddGroup: () => void;
  groupInputRef: React.RefObject<HTMLInputElement | null>;
  groupSizerRef: React.RefObject<HTMLSpanElement | null>;
  groupInputWidth: number;
  sortBy: SortBy;
  setSortByAndPersist: (val: SortBy) => void;
  loadGroups: () => Promise<unknown>;
  loadLinks?: () => Promise<unknown>;
  onOpenSearch?: () => void;
  onDropLink?: (linkId: string, groupId: string) => void;
};

export function CollectionDrop({
  groupId,
  onDropLink,
  className,
  children,
}: {
  groupId: string;
  onDropLink?: (linkId: string, groupId: string) => void;
  className: string;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      data-drop-target={groupId}
      data-drop-over={over ? "true" : "false"}
      title="Drop a link to move it here"
      className={`${className} focus-within:ring-2 focus-within:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] focus-within:ring-offset-2 focus-within:ring-offset-background ${over ? "ring-2 ring-foreground/70" : ""}`}
      onDragOver={(event) => {
        if (!onDropLink) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setOver(false);
      }}
      onDrop={(event) => {
        if (!onDropLink) return;
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        const linkId = event.dataTransfer.getData("linkId");
        if (!linkId) return;
        playUiSound("droplet");
        onDropLink(linkId, groupId);
      }}
    >
      {children}
      {over ? <span className="ms-1 text-[11px] font-medium">Move</span> : null}
    </div>
  );
}

export function SortPill({
  sortBy,
  setSortByAndPersist,
}: {
  sortBy: SortBy;
  setSortByAndPersist: (val: SortBy) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const label =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Newest";

  useEffect(() => {
    if (!open) return;
    const selected = Math.max(
      0,
      SORT_OPTIONS.findIndex((option) => option.value === sortBy),
    );
    optionRefs.current[selected]?.focus();
    const onClickAway = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, sortBy]);

  const moveOption = (key: string) => {
    const buttons = optionRefs.current;
    const focusIndex = buttons.findIndex((button) => button === document.activeElement);
    const selected = SORT_OPTIONS.findIndex((option) => option.value === sortBy);
    const next = nextOptionIndex(
      focusIndex >= 0 ? focusIndex : selected,
      key,
      SORT_OPTIONS.length,
    );
    if (next === null) return false;
    buttons[next]?.focus();
    return true;
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Sort links"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="sort-links-list"
        onClick={() => {
          setOpen((v) => !v);
          playUiSound("toggle");
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          setOpen(true);
        }}
        className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-pill ps-3 pe-2.5 text-[13px] font-medium leading-none text-muted hover:bg-pill-hover hover:text-foreground cursor-pointer ${controlPress}`}
      >
        <span>{label}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          id="sort-links-list"
          role="listbox"
          aria-label="Sort links"
          className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-surface-elevated p-1 shadow-lg"
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              setOpen(false);
              return;
            }
            if (!moveOption(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {SORT_OPTIONS.map((opt, index) => (
            <li key={opt.value} role="option" aria-selected={opt.value === sortBy}>
              <button
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                tabIndex={-1}
                onClick={() => {
                  setSortByAndPersist(opt.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                  playUiSound("tick");
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[13px] outline-none transition-[background-color,color,box-shadow] duration-[var(--duration-press)] ease-[var(--ease-out)] focus-visible:bg-pill-hover focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_45%,transparent)] ${
                  opt.value === sortBy
                    ? "text-foreground"
                    : "text-muted hover:bg-pill hover:text-foreground"
                }`}
              >
                <span>{opt.label}</span>
                {opt.value === sortBy ? (
                  <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function VaultGroupToolbar({
  openedGroupId,
  selectGroup,
  generalGroup,
  filteredFolders,
  draggingGroupId,
  setDraggingGroupId,
  persistFolderOrder,
  canReorderPills,
  handleDeleteGroup,
  addingAt,
  createGroupName,
  setCreateGroupName,
  creatingGroup,
  createGroupError,
  setCreateGroupError,
  createGroup,
  openAddGroup,
  cancelAddGroup,
  groupInputRef,
  groupSizerRef,
  groupInputWidth,
  sortBy,
  setSortByAndPersist,
  loadGroups,
  loadLinks,
  onOpenSearch,
  onDropLink,
}: VaultGroupToolbarProps) {
  const isDragging = draggingGroupId !== null;
  const [refreshing, setRefreshing] = useState(false);
  const pillIds = groupPillIds(filteredFolders.map((group) => group.id));
  const currentPill = activeGroupPill(openedGroupId, pillIds);
  const onPillKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const next = nextGroupPill(id, pillIds, event.key);
    if (!next) return;
    event.preventDefault();
    selectGroup(next);
    playUiSound("tick");
    const button = document.getElementById(`group-pill-${next}`);
    button?.focus();
    if (typeof button?.scrollIntoView === "function") {
      button.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };
  const pillRowRef = useRef<HTMLDivElement>(null);
  const [pillEdges, setPillEdges] = useState({ start: false, end: false });
  const pillKey = filteredFolders.map((group) => group.id).join("|");

  useEffect(() => {
    const el = pillRowRef.current;
    if (!el) return;
    const update = () => {
      const next = horizontalScrollEdges(
        el.scrollLeft,
        el.clientWidth,
        el.scrollWidth,
      );
      setPillEdges((prev) =>
        prev.start === next.start && prev.end === next.end ? prev : next,
      );
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(el);
      for (const child of Array.from(el.children)) observer.observe(child);
    }
    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [pillKey, generalGroup?.id, addingAt]);
  const searchShortcut =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform)
      ? "⌘K"
      : "Ctrl K";

  return (
    <div className="relative sticky top-[env(safe-area-inset-top)] z-20 -me-[var(--layout-pad)] flex min-w-0 flex-col bg-background/90 pt-3 pb-4 pe-[var(--layout-pad)] backdrop-blur-md supports-[backdrop-filter]:bg-background/75 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-6 after:translate-y-full after:bg-gradient-to-b after:from-background/80 after:to-transparent">
      <div className="flex items-center justify-between gap-[var(--layout-gap-control)]">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative min-w-0 flex-1">
        <div
          ref={pillRowRef}
          data-pill-row=""
          role="toolbar"
          aria-label="Groups"
          className="flex min-w-0 items-center gap-2 overflow-x-auto overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-3.5 -my-3.5 ps-0.5 pe-1"
        >
          {isDragging && (
            <div className="absolute inset-0 flex items-center pointer-events-none z-0 ps-0.5">
              {generalGroup ? (
                <div className="invisible shrink-0 px-4 text-[13px] h-7">
                  All
                </div>
              ) : null}
              {generalGroup ? (
                <span
                  aria-hidden
                  className="ms-0 me-2 h-5 w-px shrink-0 bg-transparent"
                />
              ) : null}
              <div className="flex items-center gap-2">
                {filteredFolders.map((g) => (
                  <div
                    key={`bg-${g.id}`}
                    className="group-pill-drop-slot inline-flex h-7 shrink-0 items-center rounded-full px-4 text-[13px] leading-none text-transparent select-none"
                  >
                    {g.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {generalGroup && onDropLink ? (
            <CollectionDrop
              groupId={generalGroup.id}
              onDropLink={onDropLink}
              className={`z-10 relative scroll-mx-8 ${
                openedGroupId === "all" ? pillActive : pillIdle
              }`}
            >
              <button
                id="group-pill-all"
                type="button"
                aria-pressed={openedGroupId === "all"}
                tabIndex={currentPill === "all" ? 0 : -1}
                onClick={() => {
                  selectGroup("all");
                  playUiSound("tick");
                }}
                onKeyDown={(event) => onPillKeyDown(event, "all")}
                className="h-7 bg-transparent px-4 -mx-4 outline-none"
              >
                All
              </button>
            </CollectionDrop>
          ) : (
            <button
              id="group-pill-all"
              type="button"
              aria-pressed={openedGroupId === "all"}
              tabIndex={currentPill === "all" ? 0 : -1}
              onClick={() => {
                selectGroup("all");
                playUiSound("tick");
              }}
              onKeyDown={(event) => onPillKeyDown(event, "all")}
              className={`z-10 relative scroll-mx-8 ${
                openedGroupId === "all" ? pillActive : pillIdle
              }`}
            >
              All
            </button>
          )}

          <Reorder.Group
            axis="x"
            values={filteredFolders}
            onReorder={persistFolderOrder}
            data-dragging={isDragging ? "true" : undefined}
            className="group-pills-row flex min-w-0 items-center gap-2 overflow-visible z-10 relative bg-transparent"
            as="div"
          >
            {filteredFolders.map((g) => (
              <Reorder.Item
                key={g.id}
                value={g}
                as="div"
                data-group-pill=""
                drag={canReorderPills ? "x" : false}
                className="shrink-0 group/pill"
                onDragStart={() => setDraggingGroupId(g.id)}
                onDragEnd={() => setDraggingGroupId(null)}
                whileDrag={{
                  scale: 1.04,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                  zIndex: 20,
                }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 32,
                  mass: 0.6,
                }}
                layout
              >
                <CollectionDrop
                  groupId={g.id}
                  onDropLink={onDropLink}
                  className={`scroll-mx-8 ${g.id === openedGroupId ? pillActive : pillIdle} gap-0 pe-1.5 ${
                    draggingGroupId === g.id
                      ? "bg-surface-elevated/80 border-border-strong shadow-[0_0_12px_rgba(255,255,255,0.04)]"
                      : ""
                  }`}
                >
                  <button
                    id={`group-pill-${g.id}`}
                    type="button"
                    aria-pressed={g.id === openedGroupId}
                    tabIndex={currentPill === g.id ? 0 : -1}
                    onClick={() => {
                      selectGroup(g.id);
                      playUiSound("tick");
                    }}
                    onKeyDown={(event) => onPillKeyDown(event, g.id)}
                    className="bg-transparent outline-none"
                  >
                    {g.name}
                  </button>
                  {g.name !== GENERAL_GROUP_NAME && (
                    <button
                      type="button"
                      aria-label={`Move ${g.name} to Trash`}
                      tabIndex={g.id === openedGroupId ? 0 : -1}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteGroup(g.id);
                      }}
                      className="group-pill-delete ms-1.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-400 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-danger/50 cursor-pointer outline-none"
                    >
                      <X className="size-2.5" />
                    </button>
                  )}
                </CollectionDrop>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
        {/* Background alpha, not a fade toward black, so the edge matches the bar. */}
        <span
          aria-hidden
          data-pill-fade="start"
          data-side="start"
          data-visible={pillEdges.start && !isDragging ? "true" : "false"}
          className={`pointer-events-none absolute inset-y-0 start-0 z-30 w-11 transition-opacity duration-[var(--duration-ui)] ease-[var(--ease-out)] motion-reduce:transition-none ${
            pillEdges.start && !isDragging ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(to right, rgb(from var(--background) r g b / 1) 0%, rgb(from var(--background) r g b / 0) 100%)",
          }}
        />
        <span
          aria-hidden
          data-pill-fade="end"
          data-side="end"
          data-visible={pillEdges.end && !isDragging ? "true" : "false"}
          className={`pointer-events-none absolute inset-y-0 end-0 z-30 w-11 transition-opacity duration-[var(--duration-ui)] ease-[var(--ease-out)] motion-reduce:transition-none ${
            pillEdges.end && !isDragging ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(to left, rgb(from var(--background) r g b / 1) 0%, rgb(from var(--background) r g b / 0) 100%)",
          }}
        />
        </div>

        {addingAt !== null ? (
          <form
            className="relative flex shrink-0 items-center"
            onSubmit={(e) => {
              e.preventDefault();
              void createGroup();
            }}
          >
            <span
              ref={groupSizerRef}
              aria-hidden
              className="pointer-events-none invisible absolute whitespace-pre px-4 text-[13px] leading-none"
            >
              {createGroupName || "Group"}
            </span>
            <input
              ref={groupInputRef}
              type="text"
              value={createGroupName}
              aria-label="Group name"
              aria-invalid={createGroupError ? true : undefined}
              aria-describedby={createGroupError ? "create-group-error" : undefined}
              onChange={(e) => {
                const next = e.target.value;
                setCreateGroupName(next);
                setCreateGroupError(groupNameDraftIssue(next));
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelAddGroup();
                }
              }}
              placeholder="Group"
              disabled={creatingGroup}
              style={{ width: groupInputWidth }}
              className="h-7 shrink-0 rounded-full border border-dashed border-foreground/40 bg-surface px-4 text-[13px] leading-none text-foreground outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
            {creatingGroup ? (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-surface/80">
                <AppLoader compact label="loading" />
              </span>
            ) : null}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              openAddGroup(filteredFolders.length);
              playUiSound("bloom");
            }}
            aria-label="Add group"
            title="Add group"
            className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong bg-transparent text-muted hover:border-foreground/40 hover:text-foreground ${controlPress}`}
          >
            <Plus className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>
      <div className="relative z-10 flex shrink-0 items-center gap-2">
        {onOpenSearch ? (
          <button
            type="button"
            onClick={() => {
              onOpenSearch();
              playUiSound("tick");
            }}
            aria-keyshortcuts="Control+K Meta+K"
            className={`${pillIdle} gap-1.5 px-3`}
          >
            <Search className="size-3.5" strokeWidth={2} aria-hidden />
            <span>Search</span>
            <kbd className="hidden font-mono text-[10px] font-normal text-subtle md:inline">
              {searchShortcut}
            </kbd>
          </button>
        ) : null}
        <SortPill sortBy={sortBy} setSortByAndPersist={setSortByAndPersist} />
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            playUiSound("loading");
            void Promise.all([loadGroups(), loadLinks?.()]).finally(() => {
              window.setTimeout(() => setRefreshing(false), 400);
            });
          }}
          aria-label="Refresh"
          title="Refresh"
          className={`${pillIdle} justify-center px-2.5`}
        >
          <RotateCw
            className={`size-3.5 -scale-x-100 transition-transform duration-500 ease-out ${
              refreshing ? "animate-spin" : ""
            }`}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </div>
      </div>
      {createGroupError ? (
        <p id="create-group-error" role="alert" className="pt-1 text-[12px] text-danger">
          {createGroupError}
        </p>
      ) : null}
    </div>
  );
}
