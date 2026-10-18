"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "cmdk";
import { Folder, LayoutGrid, Plus, Settings, Trash2 } from "lucide-react";
import { apiUrl } from "@/lib/api-base";
import { asSentence, explainLoadError } from "@/lib/load-error";
import type { LinkApiRow } from "@/lib/links";
import MorphText from "@/components/MorphText";
import SearchResultText from "@/components/vault/SearchResultText";
import { openShortcutHelp } from "@/components/vault/ShortcutHelp";
import {
  matchingPalettePages,
  paletteMissCopy,
  palettePagesForUser,
} from "@/lib/palette-pages";
import { NOTE_DONE_LABEL, noteCountLabel, noteIssue, SAVE_NOTE_LABEL } from "@/lib/note-limit";
import { saveLinkNote } from "@/lib/save-link-note";
import { NoteCount } from "@/components/vault/NoteCount";
import { groupsMatchingQuery } from "@/lib/group-query";
import { saveOfferUrl } from "@/lib/save-query";
import {
  anotherDialogIsOpen,
  isPaletteShortcut,
  shouldTogglePalette,
} from "@/lib/palette-shortcut";
import {
  commandPaletteJumpGroups,
  searchResultGroupLabel,
} from "@/lib/search-group";

type PaletteGroup = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: PaletteGroup[];
  onSelectGroup: (id: string) => void;
  onOpenLink?: (link: LinkApiRow, originEl: HTMLElement) => void;
  onSaveUrl?: (
    url: string,
  ) => Promise<
    { ok: true; link: LinkApiRow } | { ok: false; error: string }
  >;
  onNoteSaved?: (link: LinkApiRow) => void;
  isOwner?: boolean;
};

export default function CommandPalette({
  open,
  onOpenChange,
  groups,
  onSelectGroup,
  onOpenLink,
  onSaveUrl,
  onNoteSaved,
  isOwner = false,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [linkResults, setLinkResults] = useState<LinkApiRow[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingUrl, setSavingUrl] = useState(false);
  const [savedLink, setSavedLink] = useState<LinkApiRow | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const requestIdRef = useRef(0);

  const closePalette = useCallback(() => {
    onOpenChange(false);
    setSearch("");
    requestIdRef.current++;
    setLinkResults([]);
    setLoadingLinks(false);
    setSearchError(null);
    setSearchAttempt(0);
    setSaveError(null);
    setSavingUrl(false);
    setSavedLink(null);
    setNote("");
    setNoteError(null);
    setSavingNote(false);
  }, [onOpenChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPaletteShortcut(e)) return;
      e.preventDefault();
      if (!shouldTogglePalette(open, anotherDialogIsOpen())) return;
      if (open) closePalette();
      else onOpenChange(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange, closePalette]);

  useEffect(() => {
    if (!open || !savedLink) return;
    const timer = window.setTimeout(() => noteRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open, savedLink]);

  const handleDialogOpenChange = useCallback(
    (next: boolean) => {
      if (next) onOpenChange(true);
      else closePalette();
    },
    [onOpenChange, closePalette],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const query = value.trim();
    if (!query) {
      requestIdRef.current++;
      setLinkResults([]);
      setLoadingLinks(false);
      setSearchError(null);
    } else {
      setLoadingLinks(true);
      setSearchError(null);
      setSaveError(null);
    }
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (!query) return;
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(() => {
      void fetch(apiUrl(`/api/links?search=${encodeURIComponent(query)}&limit=8`))
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof data.error === "string" ? data.error : "Search failed",
            );
          }
          return data;
        })
        .then((data) => {
          if (requestId !== requestIdRef.current) return;
          setLinkResults(Array.isArray(data.links) ? data.links : []);
          setSearchError(null);
        })
        .catch((error: unknown) => {
          if (requestId !== requestIdRef.current) return;
          setLinkResults([]);
          setSearchError(
            error instanceof Error ? error.message : "Search failed",
          );
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoadingLinks(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [search, searchAttempt]);

  const jumpGroups = useMemo(() => commandPaletteJumpGroups(groups), [groups]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jumpGroups.slice(0, 6);
    return groupsMatchingQuery(jumpGroups, q);
  }, [jumpGroups, search]);

  const pages = useMemo(
    () => matchingPalettePages(search, palettePagesForUser(isOwner)),
    [isOwner, search],
  );

  const openLink = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const offerUrl = saveOfferUrl(
    search,
    linkResults.map((link) => link.url),
  );

  const saveOfferedUrl = useCallback(async () => {
    if (!offerUrl || !onSaveUrl || savingUrl) return;
    setSavingUrl(true);
    setSaveError(null);
    const result = await onSaveUrl(offerUrl);
    setSavingUrl(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSavedLink(result.link);
    setNote("");
    setNoteError(null);
  }, [offerUrl, onSaveUrl, savingUrl]);

  const finishNote = useCallback(async () => {
    if (!savedLink || savingNote) return;
    const trimmed = note.trim();
    if (!trimmed) {
      closePalette();
      return;
    }
    const issue = noteIssue(note);
    if (issue) {
      setNoteError(issue);
      return;
    }
    setSavingNote(true);
    setNoteError(null);
    const result = await saveLinkNote(savedLink.id, trimmed);
    setSavingNote(false);
    if (!result.ok) {
      setNoteError(result.error);
      return;
    }
    onNoteSaved?.(result.link);
    closePalette();
  }, [closePalette, note, onNoteSaved, savedLink, savingNote]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleDialogOpenChange}
      label="Command palette"
      shouldFilter={false}
      contentClassName="fixed left-1/2 top-[18%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-2xl"
      overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
    >
      {savedLink ? (
        <form
          className="flex flex-col gap-2 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void finishNote();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape") event.stopPropagation();
          }}
        >
          <p className="text-[12px] font-medium text-success" role="status">
            Link saved
          </p>
          <label htmlFor="palette-save-note" className="text-[11px] text-muted">
            Add a note
          </label>
          <textarea
            ref={noteRef}
            id="palette-save-note"
            aria-label="Notes"
            value={note}
            rows={2}
            placeholder="What should you remember?"
            aria-invalid={noteError ? true : undefined}
            aria-describedby={
              [noteCountLabel(note) ? "palette-note-count" : null, noteError ? "palette-note-error" : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            onChange={(event) => {
              setNote(event.target.value);
              setNoteError(noteIssue(event.target.value));
            }}
            className="w-full resize-none rounded-md border border-border bg-transparent px-2.5 py-1.5 text-[13px] text-foreground outline-none placeholder:text-subtle focus-visible:bg-surface"
          />
          <NoteCount notes={note} id="palette-note-count" />
          <div>
            <button
              type="submit"
              disabled={savingNote || Boolean(noteIssue(note))}
              className="inline-flex h-7 items-center rounded-full bg-pill-active px-2.5 text-[13px] font-medium text-pill-active-fg transition-[transform,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
            >
              <MorphText duration={220}>
                {note.trim() ? SAVE_NOTE_LABEL : NOTE_DONE_LABEL}
              </MorphText>
            </button>
          </div>
          {noteError ? (
            <p id="palette-note-error" className="text-[12px] text-danger" role="alert">
              {noteError}
            </p>
          ) : null}
        </form>
      ) : null}
      {savedLink ? null : (
      <CommandInput
        value={search}
        onValueChange={handleSearchChange}
        placeholder="Search links, jump to a group, or go to a page…"
        className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-subtle focus-visible:bg-surface"
      />
      )}
      {savedLink ? null : (
      <CommandList className="max-h-80 overflow-y-auto p-2">
        {loadingLinks ? (
          <CommandLoading className="px-2 py-1.5 text-[12px] text-subtle">
            Searching links…
          </CommandLoading>
        ) : null}

        {searchError && !loadingLinks ? (
          <div className="flex flex-col items-start gap-2 px-2 py-3" role="alert">
            <p className="text-[13px] text-danger">
              {asSentence(explainLoadError(searchError) ?? searchError)} Your library is
              unchanged.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoadingLinks(true);
                setSearchError(null);
                setSearchAttempt((attempt) => attempt + 1);
              }}
              className="inline-flex h-7 items-center rounded-full bg-pill-active px-2.5 text-[13px] font-medium text-pill-active-fg outline-none transition-[transform,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_70%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated active:scale-[0.97]"
            >
              Retry
            </button>
          </div>
        ) : null}

        {search.trim() &&
        !loadingLinks &&
        !searchError &&
        !filteredGroups.length &&
        !linkResults.length &&
        !pages.length &&
        !offerUrl ? (
          <div className="flex flex-col items-start gap-2 px-2 py-3">
            <p className="text-[13px] text-subtle" role="status">
              {paletteMissCopy(search)}
            </p>
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="inline-flex h-7 items-center rounded-full bg-pill px-2.5 text-[13px] font-medium text-foreground outline-none transition-[transform,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-pill-hover focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_70%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated active:scale-[0.97]"
            >
              Clear search
            </button>
          </div>
        ) : null}

        {offerUrl && !loadingLinks && !searchError && onSaveUrl ? (
          <CommandGroup
            heading="Save"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-subtle"
          >
            <CommandItem
              value="save-typed-url"
              onSelect={() => {
                void saveOfferedUrl();
              }}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-pill-hover"
            >
              <Plus className="size-3.5 text-muted" strokeWidth={2} />
              <span className="min-w-0 truncate">
                {savingUrl ? "Saving…" : `Save ${offerUrl}`}
              </span>
            </CommandItem>
            {saveError ? (
              <p className="px-2 py-1 text-[12px] text-danger" role="alert">
                {saveError}
              </p>
            ) : null}
          </CommandGroup>
        ) : null}

        {filteredGroups.length ? (
          <CommandGroup
            heading="Groups"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-subtle"
          >
            {filteredGroups.map((g) => (
              <CommandItem
                key={g.id}
                value={`group-${g.id}`}
                onSelect={() => {
                  onSelectGroup(g.id);
                  closePalette();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-pill-hover"
              >
                <Folder className="size-3.5 text-muted" strokeWidth={2} />
                {g.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {linkResults.length ? (
          <CommandGroup
            heading="Links"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-subtle"
          >
            {linkResults.map((link) => (
              <CommandItem
                key={link.id}
                value={`link-${link.id}`}
                onSelect={() => {
                  const origin =
                    document.activeElement instanceof HTMLElement
                      ? document.activeElement
                      : document.body;
                  if (onOpenLink) onOpenLink(link, origin);
                  else openLink(link.url);
                  closePalette();
                }}
                className="flex cursor-pointer flex-col gap-0.5 rounded-md px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-pill-hover"
              >
                <SearchResultText
                  link={link}
                  groupLabel={searchResultGroupLabel(link.groupId, groups)}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {pages.length ? (
          <CommandGroup
            heading="Go to"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-subtle"
          >
            {pages.map((page) => {
              const Icon =
                page.id === "workspace"
                  ? LayoutGrid
                  : page.id === "settings"
                    ? Settings
                    : Trash2;
              return (
                <CommandItem
                  key={page.id}
                  value={`page-${page.id}`}
                  onSelect={() => {
                    router.push(page.href);
                    closePalette();
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-pill-hover"
                >
                  <Icon className="size-3.5 text-muted" strokeWidth={2} />
                  {page.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}
      </CommandList>
      )}
      {savedLink ? null : (
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <span className="text-[11px] text-subtle">Keyboard shortcuts</span>
        <button
          type="button"
          onClick={() => {
            closePalette();
            openShortcutHelp();
          }}
          aria-label="Show keyboard shortcuts"
          className="rounded-md border border-border bg-pill px-1.5 py-0.5 font-mono text-[11px] text-subtle hover:text-foreground"
        >
          ?
        </button>
      </div>
      )}
    </CommandDialog>
  );
}
