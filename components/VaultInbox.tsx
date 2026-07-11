"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import AddLinkCard from "@/components/AddLinkCard";
import { AppLoader } from "@/components/AppLoader";
import LinkCard from "@/components/LinkCard";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
import { apiUrl } from "@/lib/api-base";
import {
  applyVicinityCardStrokes,
  clearVicinityCardStrokes,
} from "@/lib/card-vicinity-stroke";
import { UNCATEGORIZED_GROUP_NAME } from "@/lib/group-constants";
import type { LinkApiRow } from "@/lib/links";

const GROUP_PILL_MIN_PX = 96;
const GRID_SIZE_KEY = "nab-grid-size";

type GridSize = "compact" | "default" | "large";

const GRID_SIZES: { id: GridSize; label: string; title: string }[] = [
  { id: "compact", label: "S", title: "Compact grid" },
  { id: "default", label: "M", title: "Default grid" },
  { id: "large", label: "L", title: "Large grid" },
];

function readStoredGridSize(): GridSize {
  if (typeof window === "undefined") return "default";
  try {
    const raw = window.localStorage.getItem(GRID_SIZE_KEY);
    if (raw === "compact" || raw === "default" || raw === "large") return raw;
  } catch {
    /* ignore */
  }
  return "default";
}

type GroupRow = {
  id: string;
  name: string;
  createdAt: string;
  linksCount: number;
  previewTitles: string[];
  sortOrder?: number;
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
  const [savePhase, setSavePhase] = useState<"paste" | "place">("paste");
  const [placeGroupId, setPlaceGroupId] = useState<string | null>(null);
  const [newGroupNameDraft, setNewGroupNameDraft] = useState("");
  const [creatingNewGroup, setCreatingNewGroup] = useState(false);

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
  const [createGroupName, setCreateGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [addingAt, setAddingAt] = useState<number | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [openedLinkId, setOpenedLinkId] = useState<string | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<DOMRect | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [insertHoverIndex, setInsertHoverIndex] = useState<number | null>(null);
  const [dragPillWidth, setDragPillWidth] = useState(GROUP_PILL_MIN_PX);
  const [dragPillLabel, setDragPillLabel] = useState("");
  const [dragCursor, setDragCursor] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [dragSnapped, setDragSnapped] = useState(false);
  const [gridSize, setGridSize] = useState<GridSize>("default");
  const groupInputRef = useRef<HTMLInputElement | null>(null);
  const groupSizerRef = useRef<HTMLSpanElement | null>(null);
  const [groupInputWidth, setGroupInputWidth] = useState(GROUP_PILL_MIN_PX);
  const dragGroupIdRef = useRef<string | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pointerDragRef = useRef<{
    id: string;
    label: string;
    fromIndex: number;
    startX: number;
    startY: number;
    width: number;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    setGridSize(readStoredGridSize());
  }, []);

  const setGridSizeAndPersist = (next: GridSize) => {
    setGridSize(next);
    try {
      window.localStorage.setItem(GRID_SIZE_KEY, next);
    } catch {
      /* ignore */
    }
  };

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

  const saveLink = useCallback(
    async (
      url: string,
      groupId: string,
      options?: { newGroupName?: string },
    ): Promise<
      { ok: true; link: LinkApiRow } | { ok: false; error: string }
    > => {
      const payload: Record<string, string> = { url };
      if (options?.newGroupName?.trim()) {
        payload.newGroupName = options.newGroupName.trim();
      } else {
        payload.groupId = groupId;
      }

      try {
        const res = await fetch(apiUrl("/api/links"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // Treat duplicate as success if we got the existing row back.
          if (
            res.status === 409 &&
            data.link &&
            typeof data.link === "object"
          ) {
            return { ok: true, link: data.link as LinkApiRow };
          }
          const msg =
            typeof data.error === "string" ? data.error : "Failed to save";
          const hint =
            typeof data.hint === "string" && data.hint.trim()
              ? ` — ${data.hint.trim()}`
              : "";
          return { ok: false, error: `${msg}${hint}` };
        }
        if (data.link && typeof data.link === "object") {
          return { ok: true, link: data.link as LinkApiRow };
        }
        return { ok: false, error: "Failed to save" };
      } catch {
        return { ok: false, error: "Network error — try again" };
      }
    },
    [],
  );

  const resetSaveForm = () => {
    setUrlInput("");
    setNewGroupNameDraft("");
    setCreatingNewGroup(false);
    setPlaceGroupId(null);
    setSavePhase("paste");
    setSaveError(null);
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSavedFlash(false);
    const url = urlInput.trim();
    if (!url) {
      setSaveError("Enter a URL");
      return;
    }
    setPlaceGroupId(openedGroupId);
    setCreatingNewGroup(false);
    setNewGroupNameDraft("");
    setSavePhase("place");
  };

  const handlePlaceSave = async () => {
    const url = urlInput.trim();
    if (!url) {
      setSaveError("Enter a URL");
      setSavePhase("paste");
      return;
    }

    const trimmedNew = creatingNewGroup ? newGroupNameDraft.trim() : "";
    const groupId = placeGroupId ?? openedGroupId;
    if (!groupId && !trimmedNew) {
      setSaveError("Pick a group");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveLink(url, groupId ?? "", {
        newGroupName: trimmedNew || undefined,
      });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      resetSaveForm();
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
      const row = result.link;
      if (row.groupId === openedGroupId) {
        setLinks((prev) => [row, ...prev.filter((l) => l.id !== row.id)]);
      } else {
        void loadLinks();
      }
      void loadGroups();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savePhase === "paste") {
      handlePasteSubmit(e);
      return;
    }
    await handlePlaceSave();
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

  const createGroup = async () => {
    const name = createGroupName.trim();
    if (!name) {
      setGroupsError("Group name cannot be empty");
      return;
    }
    const insertAt = addingAt ?? groups.length;
    setCreatingGroup(true);
    setGroupsError(null);
    try {
      const res = await fetch(apiUrl("/api/groups"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, insertAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupsError(
          typeof data.error === "string" ? data.error : "Failed to create group",
        );
        return;
      }
      const created = data.group as GroupRow | undefined;
      setCreateGroupName("");
      setAddingAt(null);
      await loadGroups();
      if (created?.id) {
        setSelectedGroupId(created.id);
        setOpenedGroupId(created.id);
      }
    } catch {
      setGroupsError("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const openAddGroup = (at: number) => {
    if (draggingGroupId) return;
    setAddingAt(at);
    setCreateGroupName("");
    setGroupsError(null);
    setInsertHoverIndex(null);
    window.setTimeout(() => groupInputRef.current?.focus(), 30);
  };

  const cancelAddGroup = () => {
    setAddingAt(null);
    setCreateGroupName("");
  };

  useEffect(() => {
    if (addingAt == null) return;
    const el = groupSizerRef.current;
    if (!el) return;
    setGroupInputWidth(Math.max(GROUP_PILL_MIN_PX, el.offsetWidth + 4));
  }, [addingAt, createGroupName]);

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
  };

  const persistGroupOrder = useCallback(async (ordered: GroupRow[]) => {
    const previous = groups;
    setGroups(ordered);
    try {
      const res = await fetch(apiUrl("/api/groups"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: ordered.map((g) => g.id) }),
      });
      if (!res.ok) {
        setGroups(previous);
        const data = await res.json().catch(() => ({}));
        setGroupsError(
          typeof data.error === "string"
            ? data.error
            : "Failed to save group order",
        );
      }
    } catch {
      setGroups(previous);
      setGroupsError("Failed to save group order");
    }
  }, [groups]);

  const clearDragState = useCallback(() => {
    dragGroupIdRef.current = null;
    dropIndexRef.current = null;
    pointerDragRef.current = null;
    dragMovedRef.current = false;
    setDraggingGroupId(null);
    setDropIndex(null);
    setDragPillWidth(GROUP_PILL_MIN_PX);
    setDragPillLabel("");
    setDragCursor(null);
    setDragSnapped(false);
  }, []);

  const commitDrop = useCallback(() => {
    const fromId = dragGroupIdRef.current;
    const toIndex = dropIndexRef.current;
    clearDragState();
    if (!fromId || toIndex == null || groupSearch.trim()) return;

    const fromIndex = groups.findIndex((g) => g.id === fromId);
    if (fromIndex < 0) return;

    const without = groups.filter((g) => g.id !== fromId);
    const clamped = Math.max(0, Math.min(toIndex, without.length));
    const next = [...without];
    next.splice(clamped, 0, groups[fromIndex]);

    const same =
      next.length === groups.length &&
      next.every((g, i) => g.id === groups[i]?.id);
    if (same) return;
    void persistGroupOrder(next);
  }, [clearDragState, groupSearch, groups, persistGroupOrder]);

  const setDropAt = useCallback((index: number) => {
    dropIndexRef.current = index;
    setDropIndex(index);
  }, []);

  const pillsRowRef = useRef<HTMLDivElement | null>(null);

  const lastPointerRef = useRef({ x: 0, y: 0 });

  const updateDropFromClientX = useCallback(
    (clientX: number) => {
      const rowEl = pillsRowRef.current;
      if (!rowEl || !dragGroupIdRef.current) return;
      const pills = rowEl.querySelectorAll<HTMLElement>("[data-group-pill]");
      if (!pills.length) {
        setDropAt(0);
        return;
      }
      for (let i = 0; i < pills.length; i += 1) {
        const rect = pills[i].getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) {
          setDropAt(i);
          return;
        }
      }
      setDropAt(pills.length);
    },
    [setDropAt],
  );

  const syncCarryToSlot = useCallback((clientX: number, clientY: number) => {
    const rowEl = pillsRowRef.current;
    if (!rowEl || !dragGroupIdRef.current) return;
    const slot = rowEl.querySelector<HTMLElement>("[data-drop-slot]");
    if (slot) {
      const r = slot.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const near = Math.hypot(clientX - cx, clientY - cy) < 56;
      setDragSnapped(near);
      setDragCursor(near ? { x: cx, y: cy } : { x: clientX, y: clientY });
      return;
    }
    setDragSnapped(false);
    setDragCursor({ x: clientX, y: clientY });
  }, []);

  useLayoutEffect(() => {
    if (!draggingGroupId) return;
    syncCarryToSlot(lastPointerRef.current.x, lastPointerRef.current.y);
  }, [draggingGroupId, dropIndex, dragPillWidth, syncCarryToSlot]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = pointerDragRef.current;
      if (!drag) return;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (!dragMovedRef.current) {
        if (dist < 6) return;
        dragMovedRef.current = true;
        dragGroupIdRef.current = drag.id;
        setDraggingGroupId(drag.id);
        setDragPillWidth(drag.width);
        setDragPillLabel(drag.label);
        setDragCursor({ x: e.clientX, y: e.clientY });
        setDropAt(drag.fromIndex);
        setInsertHoverIndex(null);
        setAddingAt(null);
      }
      updateDropFromClientX(e.clientX);
      syncCarryToSlot(e.clientX, e.clientY);
    };

    const onUp = () => {
      if (!pointerDragRef.current) return;
      if (dragMovedRef.current) {
        suppressClickRef.current = true;
        commitDrop();
      } else {
        clearDragState();
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [
    clearDragState,
    commitDrop,
    setDropAt,
    syncCarryToSlot,
    updateDropFromClientX,
  ]);

  const fieldClass =
    "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-border-strong focus:ring-1 focus:ring-foreground/20";
  const pillBase =
    "inline-flex h-7 shrink-0 items-center rounded-full border border-transparent px-2.5 text-[13px] leading-none transition-colors select-none";
  const pillActive = `${pillBase} bg-pill-active text-pill-active-fg`;
  const pillIdle = `${pillBase} bg-pill text-muted hover:bg-pill-hover`;
  const canReorderPills = !groupSearch.trim() && addingAt == null;

  const pillsForRow = draggingGroupId
    ? filteredGroups.filter((g) => g.id !== draggingGroupId)
    : filteredGroups;
  const activeDropIndex =
    draggingGroupId && dropIndex != null
      ? Math.max(0, Math.min(dropIndex, pillsForRow.length))
      : null;

  return (
    <div
      ref={pageRef}
      className="mx-auto flex min-h-screen w-full max-w-[var(--content-max)] flex-col gap-8 p-4 min-[1712px]:border-x min-[1712px]:border-border"
    >
      {/* Sidebar — recent.design layout */}
      <aside className="grid grid-cols-2 items-start gap-x-4 gap-y-8 lg:fixed lg:left-[max(1rem,calc((100vw-var(--content-max))/2+1rem))] lg:top-0 lg:z-[45] lg:box-border lg:flex lg:h-dvh lg:w-[var(--sidebar-w)] lg:shrink-0 lg:flex-col lg:items-stretch lg:gap-8 lg:py-4">
        <div className="col-start-1 row-start-1 flex flex-col items-start gap-3">
          <a
            href="/"
            aria-label="Not a Bookmark"
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
          <div
            role="group"
            aria-label="Grid layout"
            className="flex items-center gap-1"
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
            {savePhase === "paste" ? (
              <>
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
                <button
                  type="submit"
                  disabled={saving || !urlInput.trim()}
                  className="inline-flex h-[38px] w-full items-center justify-center rounded-lg bg-pill-active px-3 text-sm font-medium text-pill-active-fg transition hover:opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="truncate text-[12px] text-subtle" title={urlInput}>
                  {urlInput}
                </p>
                <p className="text-[13px] font-medium text-foreground">
                  Where do you want to save it?
                </p>
                <div className="flex max-h-36 flex-col gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {groups.map((g) => {
                    const active =
                      !creatingNewGroup && placeGroupId === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setCreatingNewGroup(false);
                          setNewGroupNameDraft("");
                          setPlaceGroupId(g.id);
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                          active
                            ? "bg-pill-active text-pill-active-fg"
                            : "bg-pill text-muted hover:bg-pill-hover hover:text-foreground"
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingNewGroup(true);
                      setPlaceGroupId(null);
                    }}
                    className={`rounded-lg border border-dashed px-2.5 py-1.5 text-left text-[13px] transition-colors ${
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
                    className={fieldClass}
                    autoFocus
                  />
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSavePhase("paste");
                      setSaveError(null);
                      setCreatingNewGroup(false);
                      setNewGroupNameDraft("");
                    }}
                    disabled={saving}
                    className="inline-flex h-[38px] flex-1 items-center justify-center rounded-lg bg-pill px-3 text-sm text-muted transition hover:bg-pill-hover hover:text-foreground disabled:opacity-50"
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
                    className="inline-flex h-[38px] flex-1 items-center justify-center rounded-lg bg-pill-active px-3 text-sm font-medium text-pill-active-fg transition hover:opacity-90 disabled:opacity-50"
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

          <p className="hidden text-[13px] text-subtle lg:block">
            © {new Date().getFullYear()} Not a Bookmark
          </p>
        </div>
      </aside>

      {/* Main feed */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[252px]">
        <main className="vault-enter relative z-30 flex min-w-0 flex-1 flex-col bg-background">
          <header className="-mr-4 flex flex-col gap-y-1 pr-4 pt-[17px] lg:-mt-4 lg:flex-row lg:items-baseline lg:justify-between lg:gap-x-4">
            <div className="flex flex-col gap-y-1 lg:min-w-0 lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-3 lg:gap-y-1">
              <h1 className="shrink-0 text-[15px] font-medium leading-normal text-foreground">
                {openedGroup?.name ?? "Not a Bookmark"}
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

          {/* Sticky group pills */}
          <div className="sticky top-0 z-20 -mr-4 flex items-center justify-between gap-4 bg-background/95 pt-3 pb-4 pr-4 backdrop-blur-md">
            <div
              ref={pillsRowRef}
              data-dragging={draggingGroupId ? "true" : undefined}
              className="group-pills-row flex min-w-0 flex-1 items-center overflow-x-auto overflow-y-visible pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {(() => {
                const nodes: ReactNode[] = [];
                const canShowInsert = !groupSearch.trim() && !draggingGroupId;

                const renderGap = (index: number) => {
                  const isDropHere = activeDropIndex === index;
                  const isAddingHere = addingAt === index;
                  const isHoverHere =
                    canShowInsert &&
                    insertHoverIndex === index &&
                    addingAt == null;

                  if (isAddingHere) {
                    return (
                      <form
                        key={`add-${index}`}
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
                          className="h-7 shrink-0 rounded-full border border-dashed border-foreground/40 bg-surface px-2.5 text-[13px] leading-none text-foreground outline-none placeholder:text-subtle transition-[width] duration-100"
                        />
                        {creatingGroup ? (
                          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-surface/80">
                            <AppLoader
                              compact
                              size={48}
                              className="!bg-transparent !p-0"
                            />
                          </span>
                        ) : null}
                      </form>
                    );
                  }

                  if (isDropHere) {
                    return (
                      <div
                        key={`drop-${index}`}
                        data-drop-slot=""
                        aria-hidden
                        className="group-pill-drop-slot mx-1 h-7 shrink-0 rounded-full transition-[width] duration-150"
                        style={{ width: dragPillWidth }}
                      />
                    );
                  }

                  return (
                    <div
                      key={`gap-${index}`}
                      className="relative h-7 w-2 shrink-0"
                      onMouseEnter={() => {
                        if (canShowInsert) setInsertHoverIndex(index);
                      }}
                      onMouseLeave={() => {
                        setInsertHoverIndex((prev) =>
                          prev === index ? null : prev,
                        );
                      }}
                    >
                      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
                      {isHoverHere ? (
                        <>
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-y-1 left-1/2 z-10 w-px -translate-x-1/2 bg-foreground/45"
                          />
                          <button
                            type="button"
                            aria-label="Add group here"
                            onClick={() => openAddGroup(index)}
                            className="absolute left-1/2 top-0 z-20 flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-pill-active text-pill-active-fg shadow-sm outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-foreground/40"
                          >
                            <Plus className="size-2.5" strokeWidth={2.5} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  );
                };

                for (let i = 0; i <= pillsForRow.length; i += 1) {
                  nodes.push(renderGap(i));
                  const g = pillsForRow[i];
                  if (!g) continue;
                  const fromIndex = filteredGroups.findIndex(
                    (x) => x.id === g.id,
                  );
                  const tilt =
                    draggingGroupId != null
                      ? i % 2 === 0
                        ? "rotate-[-4deg] translate-y-px"
                        : "rotate-[4deg] -translate-y-px"
                      : "";
                  nodes.push(
                    <button
                      key={`pill-${g.id}`}
                      type="button"
                      data-group-pill=""
                      aria-pressed={g.id === openedGroupId}
                      onClick={() => {
                        if (suppressClickRef.current) {
                          suppressClickRef.current = false;
                          return;
                        }
                        selectGroup(g.id);
                      }}
                      onPointerDown={(e) => {
                        if (!canReorderPills || e.button !== 0) return;
                        const el = e.currentTarget;
                        const width = el.getBoundingClientRect().width;
                        dragMovedRef.current = false;
                        pointerDragRef.current = {
                          id: g.id,
                          label: g.name,
                          fromIndex: Math.max(0, fromIndex),
                          startX: e.clientX,
                          startY: e.clientY,
                          width: Math.max(GROUP_PILL_MIN_PX, width),
                          pointerId: e.pointerId,
                        };
                      }}
                      className={`${
                        g.id === openedGroupId ? pillActive : pillIdle
                      } ${canReorderPills ? "cursor-grab touch-none active:cursor-grabbing" : ""} ${tilt}`}
                    >
                      {g.name}
                    </button>,
                  );
                }

                if (addingAt !== pillsForRow.length) {
                  nodes.push(
                    <button
                      key="add-group-end"
                      type="button"
                      onClick={() => openAddGroup(pillsForRow.length)}
                      className="ml-1 inline-flex h-7 shrink-0 items-center rounded-full border border-dashed border-muted/50 bg-transparent px-2.5 text-[13px] leading-none text-muted transition-colors hover:border-foreground/35 hover:text-foreground"
                    >
                      Add group
                    </button>,
                  );
                }

                return nodes;
              })()}
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
          </div>

          {draggingGroupId && dragCursor ? (
            <div
              aria-hidden
              className="group-pill-ghost"
              data-snapped={dragSnapped ? "true" : undefined}
              style={{
                position: "fixed",
                left: dragCursor.x,
                top: dragCursor.y,
                width: dragPillWidth,
                zIndex: 80,
                transform: dragSnapped
                  ? "translate(-50%, -50%) rotate(0deg)"
                  : "translate(-50%, -60%) rotate(-8deg)",
                transition: dragSnapped
                  ? "transform 0.12s ease-out, left 0.08s ease-out, top 0.08s ease-out"
                  : "transform 0.12s ease-out",
              }}
            >
              {dragPillLabel}
            </div>
          ) : null}

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
          ) : (
            <div
              className="mind-grid"
              data-grid-size={gridSize}
              onPointerMove={(e) => {
                const grid = e.currentTarget as HTMLDivElement & {
                  __strokeX?: number;
                  __strokeY?: number;
                };
                grid.__strokeX = e.clientX;
                grid.__strokeY = e.clientY;
                if (grid.dataset.strokeRaf) return;
                grid.dataset.strokeRaf = "1";
                requestAnimationFrame(() => {
                  delete grid.dataset.strokeRaf;
                  applyVicinityCardStrokes(
                    grid,
                    grid.__strokeX ?? 0,
                    grid.__strokeY ?? 0,
                  );
                });
              }}
              onPointerLeave={(e) => {
                clearVicinityCardStrokes(e.currentTarget);
              }}
            >
              <AddLinkCard
                groupId={openedGroupId}
                saveLink={saveLink}
                onSaved={(row) => {
                  setLinks((prev) => [
                    row,
                    ...prev.filter((l) => l.id !== row.id),
                  ]);
                  void loadGroups();
                }}
              />
              {links.map((link) => (
                <LinkCard key={link.id} link={link} onOpen={openLinkDetail} />
              ))}
            </div>
          )}
        </main>

        <p className="mt-8 shrink-0 text-[13px] text-subtle lg:hidden">
          © {new Date().getFullYear()} Not a Bookmark
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
