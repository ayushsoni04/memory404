"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppLoader } from "@/components/AppLoader";
import LinkCard from "@/components/LinkCard";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
import { apiUrl } from "@/lib/api-base";
import { UNCATEGORIZED_GROUP_NAME } from "@/lib/group-constants";
import type { LinkApiRow } from "@/lib/links";

type GroupRow = {
  id: string;
  name: string;
  createdAt: string;
  linksCount: number;
  previewTitles: string[];
};

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function VaultInbox() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const [links, setLinks] = useState<LinkApiRow[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>(
    {},
  );
  const [patchErrors, setPatchErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFailedId, setCopyFailedId] = useState<string | null>(null);

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [openedGroupId, setOpenedGroupId] = useState<string | null>(null);
  const [saveToGroupId, setSaveToGroupId] = useState<string | null>(null);
  const [newGroupNameDraft, setNewGroupNameDraft] = useState("");
  const [createFolderName, setCreateFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [openedLinkId, setOpenedLinkId] = useState<string | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<DOMRect | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const linksListUrl = useCallback(
    (groupId: string | null) =>
      groupId
        ? apiUrl(`/api/links?groupId=${encodeURIComponent(groupId)}`)
        : apiUrl("/api/links"),
    [],
  );

  const loadGroups = useCallback(async () => {
    setGroupsError(null);
    try {
      const res = await fetch(apiUrl("/api/groups"));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupsError(
          typeof data.error === "string" ? data.error : "Failed to load groups",
        );
        setGroups([]);
        return;
      }
      const list = Array.isArray(data.groups) ? (data.groups as GroupRow[]) : [];
      setGroups(list);
      const inbox =
        list.find(
          (g) =>
            g.name.trim().toLowerCase() ===
            UNCATEGORIZED_GROUP_NAME.toLowerCase(),
        ) ?? list[0];
      if (inbox) {
        setSelectedGroupId((prev) => prev ?? inbox.id);
        setOpenedGroupId((prev) => prev ?? inbox.id);
        setSaveToGroupId((prev) => prev ?? inbox.id);
      }
    } catch {
      setGroupsError("Failed to load groups");
      setGroups([]);
    }
  }, []);

  const loadLinks = useCallback(async () => {
    if (!openedGroupId) return;
    setFetchError(null);
    setLoadingLinks(true);
    try {
      const res = await fetch(linksListUrl(openedGroupId));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to load links";
        const hint =
          typeof data.hint === "string" && data.hint.trim()
            ? ` — ${data.hint.trim()}`
            : "";
        setFetchError(`${msg}${hint}`);
        setLinks([]);
        return;
      }
      setLinks(Array.isArray(data.links) ? data.links : []);
    } catch {
      setFetchError("Failed to load links");
      setLinks([]);
    } finally {
      setLoadingLinks(false);
    }
  }, [linksListUrl, openedGroupId]);

  /** Poll metadata completion without full-page loading state. */
  const refreshLinksSilently = useCallback(async () => {
    if (!openedGroupId) return;
    try {
      const res = await fetch(linksListUrl(openedGroupId));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      if (Array.isArray(data.links)) setLinks(data.links);
    } catch {
      /* ignore */
    }
  }, [linksListUrl, openedGroupId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (openedGroupId) void loadLinks();
  }, [loadLinks, openedGroupId]);

  const openedGroup = groups.find((g) => g.id === openedGroupId) ?? null;

  const filteredGroups = (() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  })();

  const hasPendingMetadata = links.some((l) => l.metadata_status === "pending");

  useEffect(() => {
    if (!hasPendingMetadata) return;
    const id = window.setInterval(() => void refreshLinksSilently(), 2000);
    return () => window.clearInterval(id);
  }, [hasPendingMetadata, refreshLinksSilently]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSavedFlash(false);
    const url = urlInput.trim();
    if (!url) {
      setSaveError("Enter a URL");
      return;
    }

    setSaving(true);
    try {
      const trimmedNew = newGroupNameDraft.trim();
      const payload: Record<string, string> = { url };
      if (trimmedNew) {
        payload.newGroupName = trimmedNew;
      } else if (saveToGroupId) {
        payload.groupId = saveToGroupId;
      }

      const res = await fetch(apiUrl("/api/links"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to save";
        const hint =
          typeof data.hint === "string" && data.hint.trim()
            ? ` — ${data.hint.trim()}`
            : "";
        setSaveError(`${msg}${hint}`);
        return;
      }
      setUrlInput("");
      setNewGroupNameDraft("");
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
      await loadGroups();
      if (data.link && typeof data.link === "object") {
        const row = data.link as LinkApiRow;
        if (row.groupId === openedGroupId) {
          setLinks((prev) => [row, ...prev.filter((l) => l.id !== row.id)]);
        } else {
          await loadLinks();
        }
      } else {
        await loadLinks();
      }
    } catch {
      setSaveError("Network error — try again");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch(apiUrl(`/api/links/${id}`), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to delete";
        const hint =
          typeof data.hint === "string" && data.hint.trim()
            ? ` — ${data.hint.trim()}`
            : "";
        setDeleteErrors((prev) => ({
          ...prev,
          [id]: `${msg}${hint}`,
        }));
        return;
      }
      setLinks((prev) => prev.filter((l) => l.id !== id));
      if (openedLinkId === id) {
        setOpenedLinkId(null);
        setOverlayOrigin(null);
      }
    } catch {
      setDeleteErrors((prev) => ({
        ...prev,
        [id]: "Network error — try again",
      }));
    }
  };

  const copyLinkUrl = useCallback(async (link: LinkApiRow) => {
    setCopyFailedId((id) => (id === link.id ? null : id));
    const ok = await copyTextToClipboard(link.url);
    if (ok) {
      setCopiedId(link.id);
      window.setTimeout(() => {
        setCopiedId((id) => (id === link.id ? null : id));
      }, 2000);
    } else {
      setCopyFailedId(link.id);
      window.setTimeout(() => {
        setCopyFailedId((id) => (id === link.id ? null : id));
      }, 2500);
    }
  }, []);

  const moveLinkToGroup = async (link: LinkApiRow, nextGroupId: string) => {
    if (nextGroupId === link.groupId) return;
    setPatchErrors((p) => {
      const n = { ...p };
      delete n[link.id];
      return n;
    });
    try {
      const res = await fetch(apiUrl(`/api/links/${link.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: nextGroupId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to move link";
        setPatchErrors((p) => ({ ...p, [link.id]: msg }));
        return;
      }
      if (nextGroupId !== openedGroupId) {
        setLinks((prev) => prev.filter((l) => l.id !== link.id));
        if (openedLinkId === link.id) {
          setOpenedLinkId(null);
          setOverlayOrigin(null);
        }
      } else if (data.link) {
        setLinks((prev) =>
          prev.map((l) =>
            l.id === link.id ? (data.link as LinkApiRow) : l,
          ),
        );
      }
    } catch {
      setPatchErrors((p) => ({
        ...p,
        [link.id]: "Network error — try again",
      }));
    }
  };

  const createFolder = async () => {
    const name = createFolderName.trim();
    if (!name) {
      setGroupsError("Folder name cannot be empty");
      return;
    }
    setCreatingFolder(true);
    setGroupsError(null);
    try {
      const res = await fetch(apiUrl("/api/groups"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupsError(
          typeof data.error === "string" ? data.error : "Failed to create folder",
        );
        return;
      }
      const created = data.group as GroupRow | undefined;
      setCreateFolderName("");
      setAddingFolder(false);
      await loadGroups();
      if (created?.id) {
        setSelectedGroupId(created.id);
        setOpenedGroupId(created.id);
        setSaveToGroupId(created.id);
      }
    } catch {
      setGroupsError("Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const openAddFolder = () => {
    setAddingFolder(true);
    setCreateFolderName("");
    setGroupsError(null);
    window.setTimeout(() => folderInputRef.current?.focus(), 30);
  };

  const cancelAddFolder = () => {
    setAddingFolder(false);
    setCreateFolderName("");
  };

  const openedLink = links.find((l) => l.id === openedLinkId) ?? null;
  const openedLinkIndex = openedLink
    ? links.findIndex((l) => l.id === openedLink.id)
    : -1;

  const openLinkDetail = (link: LinkApiRow, originEl: HTMLElement) => {
    setOverlayOrigin(originEl.getBoundingClientRect());
    setOpenedLinkId(link.id);
  };

  const closeLinkDetail = () => {
    setOpenedLinkId(null);
    setOverlayOrigin(null);
  };

  const goPrevLink = () => {
    if (openedLinkIndex <= 0) return;
    setOverlayOrigin(null);
    setOpenedLinkId(links[openedLinkIndex - 1].id);
  };

  const goNextLink = () => {
    if (openedLinkIndex < 0 || openedLinkIndex >= links.length - 1) return;
    setOverlayOrigin(null);
    setOpenedLinkId(links[openedLinkIndex + 1].id);
  };

  const selectGroup = (id: string) => {
    setSelectedGroupId(id);
    setOpenedGroupId(id);
    setSaveToGroupId(id);
  };

  const fieldClass =
    "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-border-strong focus:ring-1 focus:ring-foreground/20";
  const pillBase =
    "inline-flex h-7 shrink-0 items-center rounded-full border border-transparent px-2.5 text-[13px] leading-none transition-colors";
  const pillActive = `${pillBase} bg-pill-active text-pill-active-fg`;
  const pillIdle = `${pillBase} bg-pill text-muted hover:bg-pill-hover`;

  return (
    <div
      ref={pageRef}
      className="mx-auto flex min-h-screen w-full max-w-[var(--content-max)] flex-col gap-8 p-4 min-[1712px]:border-x min-[1712px]:border-border"
    >
      {/* Sidebar — recent.design layout */}
      <aside className="grid grid-cols-2 items-start gap-x-4 gap-y-8 lg:fixed lg:left-[max(1rem,calc((100vw-var(--content-max))/2+1rem))] lg:top-0 lg:z-[45] lg:box-border lg:flex lg:h-dvh lg:w-[var(--sidebar-w)] lg:shrink-0 lg:flex-col lg:items-stretch lg:gap-8 lg:py-4">
        <div className="col-start-1 row-start-1 flex items-center justify-between">
          <a
            href="/"
            aria-label="The Vault"
            className="inline-flex items-center gap-2 text-foreground"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 0.38C0 0.17 0.17 0 0.38 0H22c5.52 0 10 4.48 10 10s-4.48 10-10 10H0V0.38Z"
                fill="currentColor"
              />
              <rect y="20" width="32" height="12" fill="currentColor" />
            </svg>
          </a>
        </div>

        <nav className="col-start-2 row-start-1 flex max-h-[40vh] flex-col items-start gap-1 overflow-y-auto lg:max-h-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filteredGroups.map((g) => {
            const active = g.id === openedGroupId || g.id === selectedGroupId;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => selectGroup(g.id)}
                className={`relative block max-w-full truncate pr-3.5 text-left text-[15px] transition-colors hover:text-foreground ${
                  active ? "text-foreground" : "text-subtle"
                }`}
              >
                {g.name}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 right-0 size-2 -translate-y-1/2 rounded-full bg-foreground"
                  />
                ) : null}
              </button>
            );
          })}
          {!filteredGroups.length && !groupsError ? (
            <span className="text-[15px] text-subtle">Loading…</span>
          ) : null}
        </nav>

        <div className="col-span-2 flex flex-col gap-5 lg:col-span-1 lg:mt-auto">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="url"
              name="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste a link…"
              className={fieldClass}
              disabled={saving}
              autoComplete="off"
            />
            <div className="flex gap-2">
              <select
                value={saveToGroupId ?? ""}
                onChange={(e) => setSaveToGroupId(e.target.value || null)}
                disabled={saving || !groups.length}
                className={`${fieldClass} min-w-0 flex-1`}
                aria-label="Save into group"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-[38px] shrink-0 items-center justify-center rounded-lg bg-pill-active px-3 text-sm font-medium text-pill-active-fg transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <AppLoader
                    compact
                    progressive
                    size={72}
                    label="Saving…"
                    className="!bg-transparent !p-0"
                  />
                ) : (
                  "Save"
                )}
              </button>
            </div>
            <input
              type="text"
              value={newGroupNameDraft}
              onChange={(e) => setNewGroupNameDraft(e.target.value)}
              placeholder="Or new group name"
              disabled={saving}
              className={fieldClass}
            />
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

          <p className="hidden text-[13px] text-subtle lg:block">
            © {new Date().getFullYear()} The Vault
          </p>
        </div>
      </aside>

      {/* Main feed */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[252px]">
        <main className="vault-enter relative z-30 flex min-w-0 flex-1 flex-col bg-background">
          <header className="-mr-4 flex flex-col gap-y-1 pr-4 pt-[17px] lg:-mt-4 lg:flex-row lg:items-baseline lg:justify-between lg:gap-x-4">
            <div className="flex flex-col gap-y-1 lg:min-w-0 lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-3 lg:gap-y-1">
              <h1 className="shrink-0 text-[15px] font-medium leading-normal text-foreground">
                {openedGroup?.name ?? "Vault"}
              </h1>
              <p className="min-w-0 text-balance text-[15px] text-subtle">
                Links you save, browsed like a dark inspiration feed.
              </p>
            </div>
            <span className="shrink-0 text-[13px] text-subtle">
              {openedGroup
                ? `${openedGroup.linksCount} link${openedGroup.linksCount === 1 ? "" : "s"}`
                : null}
            </span>
          </header>

          {/* Sticky pills / add-folder bar */}
          <div className="sticky top-0 z-20 -mr-4 flex items-center justify-between gap-4 bg-background/95 pt-4 pb-4 pr-4 backdrop-blur-md">
            {addingFolder ? (
              <form
                className="flex min-w-0 flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createFolder();
                }}
              >
                <input
                  ref={folderInputRef}
                  type="text"
                  value={createFolderName}
                  onChange={(e) => setCreateFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelAddFolder();
                    }
                  }}
                  placeholder="Folder name"
                  disabled={creatingFolder}
                  className="h-7 min-w-0 flex-1 rounded-full border border-dashed border-border bg-surface px-3 text-[13px] text-foreground outline-none placeholder:text-subtle focus:border-foreground/40"
                />
                <button
                  type="submit"
                  disabled={creatingFolder || !createFolderName.trim()}
                  className={pillActive}
                >
                  {creatingFolder ? (
                    <AppLoader
                      compact
                      size={56}
                      className="!bg-transparent !p-0"
                    />
                  ) : (
                    "Save"
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelAddFolder}
                  disabled={creatingFolder}
                  className={pillIdle}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {filteredGroups.map((g) => (
                    <button
                      key={`pill-${g.id}`}
                      type="button"
                      aria-pressed={g.id === openedGroupId}
                      onClick={() => selectGroup(g.id)}
                      className={
                        g.id === openedGroupId ? pillActive : pillIdle
                      }
                    >
                      {g.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={openAddFolder}
                    className="inline-flex h-7 shrink-0 items-center rounded-full border border-dashed border-muted/50 bg-transparent px-2.5 text-[13px] leading-none text-muted transition-colors hover:border-foreground/35 hover:text-foreground"
                  >
                    Add folder
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    type="search"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Search"
                    className="hidden h-7 w-28 rounded-full border border-border bg-surface px-2.5 text-[13px] text-foreground outline-none placeholder:text-subtle focus:border-border-strong sm:block"
                  />
                  <button
                    type="button"
                    onClick={() => void loadGroups()}
                    className={pillIdle}
                  >
                    Refresh
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Feed body */}
          {!selectedGroupId && groupsError ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
              <p>Groups could not be loaded.</p>
              <button
                type="button"
                onClick={() => void loadGroups()}
                className="mt-2 text-foreground underline"
              >
                Retry
              </button>
            </div>
          ) : !openedGroupId ? (
            <div className="flex justify-center py-16">
              <AppLoader progressive label="Loading groups…" size={120} />
            </div>
          ) : loadingLinks ? (
            <div className="flex justify-center py-16">
              <AppLoader progressive label="Loading links…" size={120} />
            </div>
          ) : fetchError ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-sm text-danger">
              <p>{fetchError}</p>
              <button
                type="button"
                onClick={() => void loadLinks()}
                className="mt-2 text-foreground underline"
              >
                Retry
              </button>
            </div>
          ) : links.length === 0 ? (
            <p className="py-16 text-center text-[15px] text-subtle">
              No links yet. Paste one in the sidebar.
            </p>
          ) : (
            <div className="mind-grid">
              {links.map((link) => (
                <LinkCard key={link.id} link={link} onOpen={openLinkDetail} />
              ))}
            </div>
          )}
        </main>

        <p className="mt-8 shrink-0 text-[13px] text-subtle lg:hidden">
          © {new Date().getFullYear()} The Vault
        </p>
      </div>

      {openedLink ? (
        <LinkDetailOverlay
          link={openedLink}
          groupName={openedGroup?.name ?? null}
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          originRect={overlayOrigin}
          onClose={closeLinkDetail}
          onPrev={goPrevLink}
          onNext={goNextLink}
          onDelete={(id) => void handleDelete(id)}
          onMove={(link, groupId) => void moveLinkToGroup(link, groupId)}
          onCopy={(link) => void copyLinkUrl(link)}
          hasPrev={openedLinkIndex > 0}
          hasNext={openedLinkIndex >= 0 && openedLinkIndex < links.length - 1}
        />
      ) : null}
    </div>
  );
}
