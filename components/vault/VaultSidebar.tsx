"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Download } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import GlitchText from "@/components/GlitchText";
import MorphText from "@/components/MorphText";
import TrashBin from "@/components/TrashBin";
import {
  EXTENSION_VERSION,
  EXTENSION_ZIP_FILENAME,
  EXTENSION_ZIP_HREF,
} from "@/lib/extension-download";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { groupNameDraftIssue } from "@/lib/group-name";
import { explainLoadError } from "@/lib/load-error";
import { NOTE_DONE_LABEL, noteCountLabel, noteIssue, SAVE_NOTE_LABEL } from "@/lib/note-limit";
import { withInboxInGroupSearch } from "@/lib/search-group";
import { GridSizeControl } from "./GridSizeControl";
import { NoteCount } from "./NoteCount";
import GroupSearchCommand from "./GroupSearchCommand";
import SidebarDitherBackground from "./SidebarDitherBackground";
import SidebarProfile from "./SidebarProfile";
import {
  controlPress,
  FIELD_CLASS,
  type GridSize,
  type GroupRow,
} from "./types";

type VaultSidebarProps = {
  gridSize: GridSize;
  setGridSizeAndPersist: (next: GridSize) => void;
  sidebarShowNotesForm: boolean;
  sidebarNotesText: string;
  setSidebarNotesText: (value: string) => void;
  finishSidebarNotesFlow: () => void | Promise<void>;
  saving: boolean;
  saveSuccess: boolean;
  savePhase: "paste" | "place";
  setSavePhase: (phase: "paste" | "place") => void;
  urlInput: string;
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
  isOwner?: boolean;
  groupSearch: string;
  setGroupSearch: (value: string) => void;
  filteredFolders: GroupRow[];
  selectGroup: (id: string) => void;
};

export default function VaultSidebar({
  gridSize,
  setGridSizeAndPersist,
  sidebarShowNotesForm,
  sidebarNotesText,
  setSidebarNotesText,
  finishSidebarNotesFlow,
  saving,
  saveSuccess,
  savePhase,
  setSavePhase,
  urlInput,
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
  isOwner = false,
  groupSearch,
  setGroupSearch,
  filteredFolders,
  selectGroup,
}: VaultSidebarProps) {
  const noteProblem = noteIssue(sidebarNotesText);
  const noteAlert = noteProblem ?? (sidebarShowNotesForm ? saveError : null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const savingNoteRef = useRef(false);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!sidebarShowNotesForm || !saveError || noteProblem) return;
    noteRef.current?.focus();
  }, [noteProblem, saveError, sidebarShowNotesForm]);
  const saveSidebarNote = async () => {
    if (savingNoteRef.current) return;
    savingNoteRef.current = true;
    setSavingNote(true);
    try {
      await finishSidebarNotesFlow();
    } finally {
      savingNoteRef.current = false;
      setSavingNote(false);
    }
  };
  const noteDescribedBy = [
    noteCountLabel(sidebarNotesText) ? "sidebar-note-count" : null,
    noteAlert ? "sidebar-note-error" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const showSaveFlow =
    sidebarShowNotesForm || saving || savePhase === "place";

  return (
    <aside className="vault-sidebar flex flex-col lg:sticky lg:top-0 lg:z-[45] lg:h-full lg:max-h-dvh lg:w-full lg:shrink-0 lg:self-stretch lg:items-stretch lg:overflow-hidden">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-black lg:rounded-none lg:border-0 lg:border-e lg:border-border">
        <SidebarDitherBackground />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-[var(--layout-gap-group)] p-[var(--layout-pad)] pb-[max(var(--layout-pad),env(safe-area-inset-bottom))] lg:gap-[var(--layout-gap-section)] lg:overflow-hidden">
          <div className="flex flex-col items-start gap-[var(--layout-gap-control)]">
            <Link
              href="/"
              aria-label="memory404"
              className={`inline-flex items-center gap-2 text-foreground hover:opacity-85 rounded-lg ${controlPress}`}
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
            <GridSizeControl
              gridSize={gridSize}
              setGridSizeAndPersist={setGridSizeAndPersist}
            />
          </div>

          <div className="flex flex-col gap-[var(--layout-gap-group)] lg:mt-auto">
            {showSaveFlow ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                {sidebarShowNotesForm ? (
                  <div className="flex flex-col gap-2 p-1">
                    <label htmlFor="sidebar-save-note" className="text-[11px] text-muted">
                      Add a note
                    </label>
                    <textarea
                      ref={noteRef}
                      id="sidebar-save-note"
                      value={sidebarNotesText}
                      onChange={(e) => {
                        setSidebarNotesText(e.target.value);
                        if (saveError) setSaveError(null);
                      }}
                      placeholder="What should you remember?"
                      rows={2}
                      aria-invalid={noteAlert ? true : undefined}
                      aria-describedby={noteDescribedBy || undefined}
                      className={`${FIELD_CLASS} resize-none`}
                    />
                    <NoteCount notes={sidebarNotesText} id="sidebar-note-count" />
                    {noteAlert ? (
                      <p id="sidebar-note-error" className="text-xs text-danger" role="alert">
                        {noteAlert}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void saveSidebarNote()}
                      disabled={savingNote || Boolean(noteProblem)}
                      aria-busy={savingNote || undefined}
                      className={`inline-flex h-8 items-center justify-center rounded-lg bg-pill-active px-3 text-sm font-medium text-pill-active-fg cursor-pointer disabled:opacity-50 ${controlPress}`}
                    >
                      <MorphText duration={220}>
                        {savingNote
                          ? "Saving…"
                          : sidebarNotesText.trim()
                            ? SAVE_NOTE_LABEL
                            : NOTE_DONE_LABEL}
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
                              style={{
                                strokeDasharray: 24,
                                strokeDashoffset: 24,
                              }}
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
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <ThinkingOrb state="listening" size={64} speed={0.95} />
                      <p
                        className="w-full truncate text-center text-[12px] text-subtle"
                        title={urlInput}
                      >
                        {urlInput}
                      </p>
                      <p
                        id="save-place-prompt"
                        className="text-center text-[13px] font-medium text-foreground"
                      >
                        Where do you want to save it?
                      </p>
                    </div>
                    <div
                      role="group"
                      aria-labelledby="save-place-prompt"
                      className="flex max-h-36 flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {groups.map((g) => {
                        const isGeneral =
                          g.name.trim().toLowerCase() ===
                          GENERAL_GROUP_NAME.toLowerCase();
                        const displayName = isGeneral ? "All" : g.name;
                        const active =
                          !creatingNewGroup && placeGroupId === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            aria-pressed={active}
                            title={displayName}
                            onClick={() => {
                              setCreatingNewGroup(false);
                              setNewGroupNameDraft("");
                              setPlaceGroupId(g.id);
                            }}
                            className={`flex min-h-11 w-full min-w-0 items-center rounded-lg px-2.5 text-start text-[13px] transition-colors cursor-pointer sm:min-h-6 sm:py-1.5 ${
                              active
                                ? "bg-pill-active text-pill-active-fg"
                                : "bg-pill text-muted hover:bg-pill-hover hover:text-foreground"
                            }`}
                          >
                            <span className="min-w-0 truncate">{displayName}</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        aria-pressed={creatingNewGroup}
                        onClick={() => {
                          setCreatingNewGroup(true);
                          setPlaceGroupId(null);
                        }}
                        className={`flex min-h-11 w-full min-w-0 items-center rounded-lg border border-dashed px-2.5 text-start text-[13px] transition-colors cursor-pointer sm:min-h-6 sm:py-1.5 ${
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
                        aria-label="Group name"
                        aria-invalid={saveError ? true : undefined}
                        aria-describedby={saveError ? "save-flow-error" : undefined}
                        onChange={(e) => {
                          const next = e.target.value;
                          setNewGroupNameDraft(next);
                          setSaveError(groupNameDraftIssue(next, groups));
                        }}
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
                        className={`inline-flex h-[38px] flex-1 items-center justify-center rounded-lg bg-pill px-3 text-sm text-muted hover:bg-pill-hover hover:text-foreground disabled:opacity-50 cursor-pointer ${controlPress}`}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={
                          saving ||
                          (creatingNewGroup
                            ? !newGroupNameDraft.trim() ||
                              Boolean(groupNameDraftIssue(newGroupNameDraft, groups))
                            : !placeGroupId)
                        }
                        className={`inline-flex h-[38px] flex-1 items-center justify-center rounded-lg bg-pill-active px-3 text-sm font-medium text-pill-active-fg hover:opacity-90 disabled:opacity-50 cursor-pointer ${controlPress}`}
                      >
                        Save
                      </button>
                    </div>
                  </>
                )}
                {saveError && !sidebarShowNotesForm ? (
                  <p id="save-flow-error" className="text-xs text-danger" role="alert">
                    {saveError}
                  </p>
                ) : null}
                {savedFlash ? (
                  <p className="text-xs text-success">Saved</p>
                ) : null}
              </form>
            ) : null}
            {groupsError ? (
              <p className="text-xs text-danger" role="alert">
                {explainLoadError(groupsError)}{" "}
                <button
                  type="button"
                  onClick={() => void loadGroups()}
                  className="underline hover:text-foreground"
                >
                  Retry
                </button>
              </p>
            ) : null}

            <nav
              aria-label="Sidebar"
              className="flex flex-col gap-[var(--layout-gap-control)]"
            >
              <GroupSearchCommand
                value={groupSearch}
                onChange={setGroupSearch}
                groups={withInboxInGroupSearch(filteredFolders, groupSearch)}
                onSelectGroup={selectGroup}
                placeholder="Search groups"
                className="w-full"
                dropdownAlign="start"
              />
              {isOwner ? (
                <Link
                  href="/workspace"
                  className={`hidden rounded-lg px-2.5 py-1.5 text-[13px] text-muted hover:bg-pill hover:text-foreground lg:block ${controlPress}`}
                >
                  Workspace
                </Link>
              ) : null}
              <a
                href={EXTENSION_ZIP_HREF}
                download={EXTENSION_ZIP_FILENAME}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg transition-[transform,opacity] duration-[160ms] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Download className="size-3.5" aria-hidden />
                Download extension
                <span className="font-mono text-[10px] font-normal opacity-70">
                  {EXTENSION_VERSION}
                </span>
              </a>
              <TrashBin
                onDropLink={(linkId) => void onDeleteLink(linkId)}
                onDropGroup={(groupId) => void onDeleteGroup(groupId)}
              />
              <p className="hidden px-2.5 pt-2 text-[13px] text-subtle lg:block">
                © {new Date().getFullYear()} memory404
              </p>
            </nav>

            <div className="mt-auto border-t border-border pt-4">
              <SidebarProfile />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
