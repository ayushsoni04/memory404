"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import LinkPreviewThumb from "@/components/LinkPreviewThumb";
import { brandThumbnailInvertInDark } from "@/lib/link-providers";
import { UNCATEGORIZED_GROUP_NAME } from "@/lib/group-constants";
import type { LinkApiRow } from "@/lib/links";
import { formatRelativeTime } from "@/lib/links";

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFailedId, setCopyFailedId] = useState<string | null>(null);

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [openedGroupId, setOpenedGroupId] = useState<string | null>(null);
  const [saveToGroupId, setSaveToGroupId] = useState<string | null>(null);
  const [newGroupNameDraft, setNewGroupNameDraft] = useState("");
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");

  const linksListUrl = useCallback(
    (groupId: string | null) =>
      groupId
        ? `/api/links?groupId=${encodeURIComponent(groupId)}`
        : "/api/links",
    [],
  );

  const loadGroups = useCallback(async () => {
    setGroupsError(null);
    try {
      const res = await fetch("/api/groups");
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

  useEffect(() => {
    if (!pageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".animate-in",
        { y: 14, opacity: 0, filter: "blur(4px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.45,
          stagger: 0.08,
          ease: "power2.out",
        },
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!pageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".folder-card",
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, stagger: 0.04, ease: "power2.out" },
      );
    }, pageRef);
    return () => ctx.revert();
  }, [filteredGroups.length, selectedGroupId]);

  useEffect(() => {
    if (!pageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".link-card",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.32, stagger: 0.03, ease: "power2.out" },
      );
    }, pageRef);
    return () => ctx.revert();
  }, [links.length, selectedGroupId]);

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

      const res = await fetch("/api/links", {
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
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
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
      if (editingId === id) {
        setEditingId(null);
        setRenameDraft("");
      }
    } catch {
      setDeleteErrors((prev) => ({
        ...prev,
        [id]: "Network error — try again",
      }));
    }
  };

  const startRename = (link: LinkApiRow) => {
    setPatchErrors((p) => {
      const n = { ...p };
      delete n[link.id];
      return n;
    });
    setEditingId(link.id);
    setRenameDraft(link.custom_title ?? "");
  };

  const cancelRename = () => {
    setEditingId(null);
    setRenameDraft("");
  };

  const saveRename = async (id: string) => {
    setRenaming(true);
    setPatchErrors((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    try {
      const res = await fetch(`/api/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customTitle: renameDraft.trim() ? renameDraft.trim() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to save name";
        const hint =
          typeof data.hint === "string" && data.hint.trim()
            ? ` — ${data.hint.trim()}`
            : "";
        setPatchErrors((p) => ({ ...p, [id]: `${msg}${hint}` }));
        return;
      }
      if (data.link) {
        setLinks((prev) =>
          prev.map((l) => (l.id === id ? (data.link as LinkApiRow) : l)),
        );
      }
      setEditingId(null);
      setRenameDraft("");
    } catch {
      setPatchErrors((p) => ({
        ...p,
        [id]: "Network error — try again",
      }));
    } finally {
      setRenaming(false);
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
      const res = await fetch(`/api/links/${link.id}`, {
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

  const clearCustomTitle = async (id: string) => {
    setRenameDraft("");
    setRenaming(true);
    setPatchErrors((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    try {
      const res = await fetch(`/api/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTitle: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to clear name";
        setPatchErrors((p) => ({ ...p, [id]: msg }));
        return;
      }
      if (data.link) {
        setLinks((prev) =>
          prev.map((l) => (l.id === id ? (data.link as LinkApiRow) : l)),
        );
      }
      setEditingId(null);
    } catch {
      setPatchErrors((p) => ({
        ...p,
        [id]: "Network error — try again",
      }));
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div
      ref={pageRef}
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:py-12"
    >
      <header className="animate-in relative overflow-hidden rounded-3xl border border-zinc-200/70 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 px-6 py-8 text-center shadow-sm dark:border-zinc-700/80 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          The Vault
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Save links into a group — default inbox is{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {UNCATEGORIZED_GROUP_NAME}
          </span>
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="animate-in flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50"
      >
        <div className="flex gap-2">
          <input
            type="url"
            name="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            disabled={saving}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Add into group
            <select
              value={saveToGroupId ?? ""}
              onChange={(e) => setSaveToGroupId(e.target.value || null)}
              disabled={saving || !groups.length}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Or create new group
            <input
              type="text"
              value={newGroupNameDraft}
              onChange={(e) => setNewGroupNameDraft(e.target.value)}
              placeholder="e.g. Design"
              disabled={saving}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Adding into:{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {newGroupNameDraft.trim()
              ? `New group “${newGroupNameDraft.trim()}”`
              : groups.find((g) => g.id === saveToGroupId)?.name ?? "—"}
          </span>
        </p>
        {groupsError ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {groupsError} — refresh the page to retry groups.
          </p>
        ) : null}
        {saveError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
        ) : null}
        {savedFlash ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Saved!
          </p>
        ) : null}
      </form>

      <section className="animate-in flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Groups
        </h2>

        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Search groups
              <input
                type="text"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="e.g. Design"
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void loadGroups()}
                className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setGroupSearch("")}
                className="rounded-md px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Clear
              </button>
            </div>
          </div>

          {!groups.length ? (
            <p className="text-sm text-zinc-500">No groups yet.</p>
          ) : filteredGroups.length === 0 ? (
            <p className="text-sm text-zinc-500">No groups match.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredGroups.map((g) => {
                const active = g.id === selectedGroupId;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setSelectedGroupId(g.id);
                      setOpenedGroupId(g.id);
                      setSaveToGroupId(g.id);
                    }}
                    className={`folder-card flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition ${
                      active
                        ? "border-blue-500 bg-blue-50 text-blue-900 shadow-md dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                        : "border-zinc-300 bg-white text-zinc-700 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    }`}
                    title="Click to view this group"
                  >
                    <div className="relative h-12 w-16">
                      <div className="absolute left-1 top-0 h-3.5 w-7 rounded-t-md bg-blue-400/90 dark:bg-blue-400/80" />
                      <div className="absolute inset-x-0 top-2 h-9 rounded-md bg-gradient-to-b from-blue-300 to-blue-500 shadow-[0_8px_24px_rgba(59,130,246,0.45)] dark:from-blue-400 dark:to-blue-600" />
                    </div>
                    <span className="line-clamp-2 text-xs font-semibold">{g.name}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {g.linksCount} link{g.linksCount === 1 ? "" : "s"}
                    </span>
                    <div className="mt-1 w-full space-y-1">
                      {g.previewTitles.length ? (
                        g.previewTitles.slice(0, 2).map((title, idx) => (
                          <p
                            key={`${g.id}-preview-${idx}`}
                            className="truncate text-[10px] text-zinc-500 dark:text-zinc-400"
                          >
                            {title}
                          </p>
                        ))
                      ) : (
                        <p className="text-[10px] text-zinc-400">No links yet</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {openedGroupId ? (
        <section className="animate-in flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Links
            </h2>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Inside{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {openedGroup?.name ?? "Group"}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenedGroupId(null)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Back to folders
          </button>
        </div>

        {!selectedGroupId && groupsError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <p>Groups could not be loaded, so your links cannot be shown.</p>
            <button
              type="button"
              onClick={() => void loadGroups()}
              className="mt-2 font-medium underline"
            >
              Retry groups
            </button>
          </div>
        ) : !selectedGroupId ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Loading groups…
          </p>
        ) : loadingLinks ? (
          <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
            <span className="inline-block size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
            <span className="ml-3">Loading links…</span>
          </div>
        ) : fetchError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <p>{fetchError}</p>
            <button
              type="button"
              onClick={() => void loadLinks()}
              className="mt-2 font-medium underline"
            >
              Retry
            </button>
          </div>
        ) : links.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No links yet. Paste one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {links.map((link) => (
              <li
                key={link.id}
                className="link-card flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-600"
              >
                {editingId === link.id ? (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Custom name (optional)
                    </label>
                    <input
                      type="text"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      placeholder={link.title}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                      disabled={renaming}
                    />
                    <p className="text-xs text-zinc-400">
                      Original title: {link.title}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={renaming}
                        onClick={() => void saveRename(link.id)}
                        className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={renaming}
                        onClick={() => void clearCustomTitle(link.id)}
                        className="rounded-md border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-600"
                      >
                        Use original title
                      </button>
                      <button
                        type="button"
                        disabled={renaming}
                        onClick={cancelRename}
                        className="rounded-md px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    {link.image_url ? (
                      <LinkPreviewThumb
                        src={link.image_url}
                        alt={`Preview for ${link.display_title}`}
                        className={`h-20 w-28 shrink-0 rounded-md border border-zinc-200 bg-zinc-100 object-contain p-2 dark:border-zinc-600 dark:bg-zinc-800 ${
                          brandThumbnailInvertInDark(link.url)
                            ? "dark:invert"
                            : ""
                        }`}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
                      >
                        {link.display_title}
                      </a>
                      <p
                        className="mt-1 select-text break-all font-mono text-xs leading-relaxed text-zinc-500 dark:text-zinc-400"
                        title={link.url}
                      >
                        {link.url}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          Open link
                        </a>
                        <button
                          type="button"
                          onClick={() => void copyLinkUrl(link)}
                          title="Copy URL to clipboard"
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          {copiedId === link.id ? "Copied!" : "Copy link"}
                        </button>
                        {copyFailedId === link.id ? (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            Copy failed — select the URL above
                          </span>
                        ) : null}
                      </div>
                      {link.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">
                          {link.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                        {formatRelativeTime(link.created_at)}
                      </p>
                      {link.metadata_status === "pending" ? (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          Fetching title & preview…
                        </p>
                      ) : null}
                      <label className="mt-2 flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Move to group
                        <select
                          value={link.groupId}
                          onChange={(e) =>
                            void moveLinkToGroup(link, e.target.value)
                          }
                          className="max-w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5 self-start">
                      <button
                        type="button"
                        onClick={() => startRename(link)}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(link.id)}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
                {patchErrors[link.id] ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {patchErrors[link.id]}
                  </p>
                ) : null}
                {deleteErrors[link.id] ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {deleteErrors[link.id]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      ) : null}
    </div>
  );
}
