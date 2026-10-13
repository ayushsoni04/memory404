"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, RotateCw, X } from "lucide-react";
import { Reorder } from "framer-motion";
import { AppLoader } from "@/components/AppLoader";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { playUiSound } from "@/lib/ui-sound";
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
};

function SortPill({
  sortBy,
  setSortByAndPersist,
}: {
  sortBy: SortBy;
  setSortByAndPersist: (val: SortBy) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Newest";

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Sort links"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          playUiSound("toggle");
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
          role="listbox"
          aria-label="Sort links"
          className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-surface-elevated p-1 shadow-lg"
        >
          {SORT_OPTIONS.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === sortBy}>
              <button
                type="button"
                onClick={() => {
                  setSortByAndPersist(opt.value);
                  setOpen(false);
                  playUiSound("tick");
                }}
                className={`flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-[background-color,color,transform] duration-[var(--duration-press)] ease-[var(--ease-out)] active:scale-[0.98] ${
                  opt.value === sortBy
                    ? "bg-pill-hover text-foreground"
                    : "text-muted hover:bg-pill hover:text-foreground"
                }`}
              >
                {opt.label}
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
}: VaultGroupToolbarProps) {
  const isDragging = draggingGroupId !== null;
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="relative sticky top-[env(safe-area-inset-top)] z-20 -me-[var(--layout-pad)] flex items-center justify-between gap-[var(--layout-gap-control)] bg-background/90 pt-3 pb-4 pe-[var(--layout-pad)] backdrop-blur-md supports-[backdrop-filter]:bg-background/75 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-6 after:translate-y-full after:bg-gradient-to-b after:from-background/80 after:to-transparent">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-3.5 -my-3.5 ps-0.5 pe-1">
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

          <button
            type="button"
            aria-pressed={openedGroupId === "all"}
            onClick={() => {
              selectGroup("all");
              playUiSound("tick");
            }}
            className={`z-10 relative ${
              openedGroupId === "all" ? pillActive : pillIdle
            }`}
          >
            All
          </button>

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
                <div
                  className={`${g.id === openedGroupId ? pillActive : pillIdle} gap-0 pe-1.5 ${
                    draggingGroupId === g.id
                      ? "bg-surface-elevated/80 border-border-strong shadow-[0_0_12px_rgba(255,255,255,0.04)]"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      selectGroup(g.id);
                      playUiSound("tick");
                    }}
                    className="bg-transparent"
                  >
                    {g.name}
                  </button>
                  {g.name !== GENERAL_GROUP_NAME && (
                    <button
                      type="button"
                      aria-label={`Move ${g.name} to Trash`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteGroup(g.id);
                      }}
                      className="group-pill-delete ms-1.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-400 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-danger/50 cursor-pointer"
                    >
                      <X className="size-2.5" />
                    </button>
                  )}
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
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
              onChange={(e) => setCreateGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelAddGroup();
                }
              }}
              placeholder="Group"
              disabled={creatingGroup}
              style={{ width: groupInputWidth }}
              className="h-7 shrink-0 rounded-full border border-dashed border-foreground/40 bg-surface px-4 text-[13px] leading-none text-foreground outline-none placeholder:text-subtle"
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
  );
}
