"use client";

import { Plus, RotateCw, X } from "lucide-react";
import { Reorder } from "framer-motion";
import { AppLoader } from "@/components/AppLoader";
import ClearSearchInput from "@/components/ClearSearchInput";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { pillActive, pillIdle, type GroupRow, type SortBy } from "./types";

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
  groupSearch: string;
  setGroupSearch: (value: string) => void;
  loadGroups: () => Promise<unknown>;
};

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
  groupSearch,
  setGroupSearch,
  loadGroups,
}: VaultGroupToolbarProps) {
  return (
    <div className="sticky top-0 z-20 -mr-4 flex items-center justify-between gap-4 bg-background pt-3 pb-4 pr-4">
      <div className="relative flex min-w-0 flex-1 items-center overflow-x-auto overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-3.5 -my-3.5">
        {draggingGroupId !== null && (
          <div className="absolute inset-0 flex items-center pointer-events-none z-0">
            {generalGroup ? (
              <div className="invisible shrink-0 px-4 text-[13px] h-7">
                {generalGroup.name}
              </div>
            ) : null}
            {generalGroup ? (
              <span
                aria-hidden
                className="mx-2 h-5 w-px shrink-0 bg-transparent"
              />
            ) : null}
            <div className="flex items-center gap-2">
              {filteredFolders.map((g) => (
                <div
                  key={`bg-${g.id}`}
                  className="inline-flex h-7 shrink-0 items-center rounded-full border border-dashed border-border-strong/50 px-4 text-[13px] leading-none text-transparent select-none bg-transparent"
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
          onClick={() => selectGroup("all")}
          className={`z-10 relative ${
            openedGroupId === "all" ? pillActive : pillIdle
          }`}
        >
          All
        </button>
        <span
          aria-hidden
          className="mx-2 h-5 w-px shrink-0 bg-border z-10 relative"
        />

        <Reorder.Group
          axis="x"
          values={filteredFolders}
          onReorder={persistFolderOrder}
          className="group-pills-row flex min-w-0 items-center gap-2 overflow-visible z-10 relative bg-transparent"
          as="div"
        >
          {filteredFolders.map((g) => (
            <Reorder.Item
              key={g.id}
              value={g}
              as="div"
              drag={canReorderPills ? "x" : false}
              className="shrink-0 group/pill"
              onDragStart={() => setDraggingGroupId(g.id)}
              onDragEnd={() => setDraggingGroupId(null)}
              whileDrag={{
                transform: "scale(1.03)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
              transition={{
                type: "spring",
                duration: 0.35,
                bounce: 0.12,
              }}
            >
              <>
                <button
                  type="button"
                  onClick={() => selectGroup(g.id)}
                  className={`${g.id === openedGroupId ? pillActive : pillIdle} transition-[background-color,border-color,color,opacity] duration-150 ${
                    draggingGroupId === g.id
                      ? "bg-surface-elevated/80 border-border-strong shadow-[0_0_12px_rgba(255,255,255,0.04)]"
                      : ""
                  } pr-1`}
                >
                  <span className="pr-1">{g.name}</span>
                  {g.name !== GENERAL_GROUP_NAME && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Move ${g.name} to Trash`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteGroup(g.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleDeleteGroup(g.id);
                        }
                      }}
                      className="group-pill-delete ml-0.5 inline-flex size-4 items-center justify-center rounded-full opacity-0 hover:bg-red-500/20 hover:text-red-400 focus-visible:opacity-100 cursor-pointer"
                    >
                      <X className="size-2.5" />
                    </span>
                  )}
                </button>
              </>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {addingAt !== null ? (
          <form
            className="relative mx-1 flex shrink-0 items-center"
            onSubmit={(e) => {
              e.preventDefault();
              void createGroup();
            }}
          >
            <span
              ref={groupSizerRef}
              aria-hidden
              className="pointer-events-none invisible absolute whitespace-pre px-2.5 text-[13px] leading-none"
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
              className="h-7 shrink-0 rounded-full border border-dashed border-foreground/40 bg-surface px-2.5 text-[13px] leading-none text-foreground outline-none placeholder:text-subtle"
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
            onClick={() => openAddGroup(filteredFolders.length)}
            aria-label="Add group"
            title="Add group"
            className="ml-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-muted/50 bg-transparent text-muted transition-colors hover:border-foreground/35 hover:text-foreground"
          >
            <Plus className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={sortBy}
          onChange={(e) => setSortByAndPersist(e.target.value as SortBy)}
          aria-label="Sort links"
          className="h-7 rounded-full border border-border bg-surface px-2.5 text-[12px] font-medium text-muted outline-none focus:border-border-strong hover:text-foreground cursor-pointer"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="domain">Domain</option>
          <option value="type">Link Type</option>
          <option value="details">Details Size</option>
        </select>
        <ClearSearchInput
          value={groupSearch}
          onChange={setGroupSearch}
          placeholder="Search"
          className="hidden h-7 w-28 rounded-full border border-border bg-surface text-[13px] text-foreground outline-none focus-within:border-border-strong sm:block"
        />
        <button
          type="button"
          onClick={() => void loadGroups()}
          aria-label="Refresh"
          title="Refresh"
          className={`${pillIdle} justify-center px-2`}
        >
          <RotateCw
            className="size-3.5 -scale-x-100"
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}
