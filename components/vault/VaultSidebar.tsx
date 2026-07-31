"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import GlitchText from "@/components/GlitchText";
import MorphText from "@/components/MorphText";
import TrashBin from "@/components/TrashBin";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import SidebarDitherBackground from "./SidebarDitherBackground";
import { FIELD_CLASS, GRID_SIZES, type GridSize, type GroupRow } from "./types";

type VaultSidebarProps = {
  gridSize: GridSize;
  setGridSizeAndPersist: (next: GridSize) => void;
  sidebarShowNotesForm: boolean;
  sidebarNotesText: string;
  setSidebarNotesText: (value: string) => void;
  sidebarCountdown: number;
  sidebarTimerActive: boolean;
  setSidebarTimerActive: (active: boolean) => void;
  finishSidebarNotesFlow: () => void;
  saving: boolean;
  saveSuccess: boolean;
  savePhase: "paste" | "place";
  setSavePhase: (phase: "paste" | "place") => void;
  urlInput: string;
  setUrlInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  groups: GroupRow[];
  creatingNewGroup: boolean;
  setCreatingNewGroup: (value: boolean) => void;
  placeGroupId: string | null;
  setPlaceGroupId: (id: string | null) => void;
  newGroupNameDraft: string;
  setNewGroupNameDraft: (value: string) => void;
  saveError: string | null;
  setSaveError: (error: string | null) => void;
  savedFlash: boolean;
  groupsError: string | null;
  loadGroups: () => Promise<unknown>;
  onDeleteLink: (linkId: string) => void;
  onDeleteGroup: (groupId: string) => void;
};

export default function VaultSidebar({
  gridSize,
  setGridSizeAndPersist,
  sidebarShowNotesForm,
  sidebarNotesText,
  setSidebarNotesText,
  sidebarCountdown,
  sidebarTimerActive,
  setSidebarTimerActive,
  finishSidebarNotesFlow,
  saving,
  saveSuccess,
  savePhase,
  setSavePhase,
  urlInput,
  setUrlInput,
  handleSubmit,
  groups,
  creatingNewGroup,
  setCreatingNewGroup,
  placeGroupId,
  setPlaceGroupId,
  newGroupNameDraft,
  setNewGroupNameDraft,
  saveError,
  setSaveError,
  savedFlash,
  groupsError,
  loadGroups,
  onDeleteLink,
  onDeleteGroup,
}: VaultSidebarProps) {
  return (
    <aside className="vault-sidebar flex flex-col lg:sticky lg:top-0 lg:z-[45] lg:h-dvh lg:w-full lg:shrink-0 lg:self-start lg:items-stretch">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-black lg:rounded-none lg:border-0 lg:border-e lg:border-border">
        <SidebarDitherBackground />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-[var(--layout-gap-group)] p-[var(--layout-pad)] pb-[max(var(--layout-pad),env(safe-area-inset-bottom))] lg:gap-[var(--layout-gap-section)]">
        <div className="flex flex-col items-start gap-3">
          <Link
            href="/"
            aria-label="memory404"
            className="inline-flex items-center gap-2 text-foreground transition hover:opacity-85"
          >
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="size-7 object-contain"
              aria-hidden
              draggable={false}
              priority
            />
            <GlitchText className="text-sm tracking-widest font-semibold uppercase">
              404
            </GlitchText>
          </Link>
          <div
            role="group"
            aria-label="Grid layout"
            className="flex items-center gap-3"
          >
            {GRID_SIZES.map((opt) => {
              const active = gridSize === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  title={opt.title}
                  aria-pressed={active}
                  onClick={() => setGridSizeAndPersist(opt.id)}
                  className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[12px] font-medium leading-none transition-colors ${
                    active
                      ? "bg-pill-active text-pill-active-fg"
                      : "bg-pill text-muted hover:bg-pill-hover hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:mt-auto">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {sidebarShowNotesForm ? (
              <div className="flex flex-col gap-2 p-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">
                    <MorphText duration={220}>
                      {sidebarTimerActive
                        ? `Add notes (closes in ${sidebarCountdown}s)`
                        : "Add notes"}
                    </MorphText>
                  </span>
                  {sidebarTimerActive && (
                    <button
                      type="button"
                      onClick={() => setSidebarTimerActive(false)}
                      className="text-[11px] text-muted hover:underline"
                    >
                      Pause
                    </button>
                  )}
                </div>
                <textarea
                  value={sidebarNotesText}
                  onChange={(e) => {
                    setSidebarNotesText(e.target.value);
                    setSidebarTimerActive(false);
                  }}
                  onFocus={() => setSidebarTimerActive(false)}
                  placeholder="Optional notes..."
                  rows={2}
                  className={`${FIELD_CLASS} resize-none`}
                />
                <button
                  type="button"
                  onClick={finishSidebarNotesFlow}
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-pill-active px-3 text-sm font-medium text-pill-active-fg cursor-pointer"
                >
                  <MorphText duration={220}>
                    {sidebarNotesText.trim() ? "Save Notes" : "Done"}
                  </MorphText>
                </button>
              </div>
            ) : saving ? (
              <div className="flex flex-col items-center justify-center py-2 w-full min-h-[64px]">
                {saveSuccess ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="t-success-check"
                      data-state="in"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--success)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-5"
                      >
                        <path
                          d="M20 6L9 17L4 12"
                          style={{ strokeDasharray: 24, strokeDashoffset: 24 }}
                        />
                      </svg>
                    </span>
                    <span className="text-[12px] text-success font-medium">
                      Link added!
                    </span>
                  </div>
                ) : (
                  <ThinkingOrb state="searching" size={64} speed={0.95} />
                )}
              </div>
            ) : savePhase === "paste" ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="url"
                  name="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste a link…"
                  className="w-full flex-1 rounded-lg border border-border bg-black px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-border-strong focus:ring-1 focus:ring-foreground/20"
                  disabled={saving}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={saving || !urlInput.trim()}
                  className="flex size-[38px] min-w-[38px] items-center justify-center rounded-full bg-pill-active text-pill-active-fg hover:opacity-90 disabled:opacity-50 transition-[transform,opacity] duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97] outline-none cursor-pointer"
                  aria-label="Add link"
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-2">
                  <ThinkingOrb state="listening" size={64} speed={0.95} />
                  <p className="w-full truncate text-center text-[12px] text-subtle" title={urlInput}>
                    {urlInput}
                  </p>
                  <p className="text-center text-[13px] font-medium text-foreground">
                    Where do you want to save it?
                  </p>
                </div>
                <div className="flex max-h-36 flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {groups.map((g) => {
                    const isGeneral =
                      g.name.trim().toLowerCase() ===
                      GENERAL_GROUP_NAME.toLowerCase();
                    const displayName = isGeneral ? "All" : g.name;
                    const active = !creatingNewGroup && placeGroupId === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setCreatingNewGroup(false);
                          setNewGroupNameDraft("");
                          setPlaceGroupId(g.id);
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-start text-[13px] transition-colors cursor-pointer ${
                          active
                            ? "bg-pill-active text-pill-active-fg"
                            : "bg-pill text-muted hover:bg-pill-hover hover:text-foreground"
                        }`}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingNewGroup(true);
                      setPlaceGroupId(null);
                    }}
                    className={`rounded-lg border border-dashed px-2.5 py-1.5 text-start text-[13px] transition-colors cursor-pointer ${
                      creatingNewGroup
                        ? "border-foreground/40 bg-surface text-foreground"
                        : "border-muted/50 bg-transparent text-muted hover:border-foreground/35 hover:text-foreground"
                    }`}
                  >
                    New group…
                  </button>
                </div>
                {creatingNewGroup ? (
                  <input
                    type="text"
                    value={newGroupNameDraft}
                    onChange={(e) => setNewGroupNameDraft(e.target.value)}
                    placeholder="Group name"
                    disabled={saving}
                    className={FIELD_CLASS}
                    autoFocus
                  />
                ) : null}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSavePhase("paste");
                      setSaveError(null);
                      setCreatingNewGroup(false);
                      setNewGroupNameDraft("");
                    }}
                    disabled={saving}
                    className="inline-flex h-[38px] flex-1 items-center justify-center rounded-lg bg-pill px-3 text-sm text-muted transition hover:bg-pill-hover hover:text-foreground disabled:opacity-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={
                      saving ||
                      (creatingNewGroup
                        ? !newGroupNameDraft.trim()
                        : !placeGroupId)
                    }
                    className="inline-flex h-[38px] flex-1 items-center justify-center rounded-lg bg-pill-active px-3 text-sm font-medium text-pill-active-fg transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
            {saveError ? (
              <p className="text-xs text-danger">{saveError}</p>
            ) : null}
            {savedFlash ? (
              <p className="text-xs text-success">Saved</p>
            ) : null}
            {groupsError ? (
              <p className="text-xs text-muted">
                {groupsError}{" "}
                <button
                  type="button"
                  onClick={() => void loadGroups()}
                  className="underline hover:text-foreground"
                >
                  Retry
                </button>
              </p>
            ) : null}
          </form>

          <nav
            aria-label="Sidebar"
            className="hidden flex-col gap-1 lg:flex"
          >
            <Link
              href="/settings"
              className="rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-pill hover:text-foreground"
            >
              Profile & billing
            </Link>
            <Link
              href="/workspace"
              className="rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-pill hover:text-foreground"
            >
              Workspace
            </Link>
            <p className="px-2.5 pt-2 text-[13px] text-subtle">
              © {new Date().getFullYear()} memory404
            </p>
          </nav>
          <TrashBin
            onDropLink={(linkId) => void onDeleteLink(linkId)}
            onDropGroup={(groupId) => void onDeleteGroup(groupId)}
          />
        </div>
        </div>
      </div>
    </aside>
  );
}
