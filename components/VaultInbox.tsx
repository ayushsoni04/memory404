"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Plus, RotateCw } from "lucide-react";
import { Reorder } from "framer-motion";
import AddLinkCard from "@/components/AddLinkCard";
import { AppLoader } from "@/components/AppLoader";
import LinkCard from "@/components/LinkCard";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
import TextSwap from "@/components/TextSwap";
import { apiUrl } from "@/lib/api-base";
import {
  applyVicinityCardStrokes,
  clearVicinityCardStrokes,
} from "@/lib/card-vicinity-stroke";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import type { LinkApiRow } from "@/lib/links";

const GROUP_PILL_MIN_PX = 96;
const GRID_SIZE_KEY = "memory404-grid-size";

type GridSize = "compact" | "default" | "large";

const GRID_SIZES: { id: GridSize; label: string; title: string }[] = [
  { id: "compact", label: "S", title: "Compact grid" },
  { id: "default", label: "M", title: "Default grid" },
  { id: "large", label: "L", title: "Large grid" },
];

function readStoredGridSize(): GridSize {
  if (typeof window === "undefined") return "large";
  try {
    const raw = window.localStorage.getItem(GRID_SIZE_KEY);
    if (raw === "compact" || raw === "default" || raw === "large") return raw;
  } catch {
    /* ignore */
  }
  return "large";
}

type GroupRow = {
  id: string;
  name: string;
  createdAt: string;
  linksCount: number;
  previewTitles: string[];
  sortOrder?: number;
};

const getLinkDomain = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "");
  } catch {
    return url;
  }
};

const getLinkType = (url: string): string => {
  try {
    const domain = getLinkDomain(url).toLowerCase();
    if (domain.includes("figma.com")) return "Figma";
    if (domain.includes("pinterest.com") || domain.includes("pin.it")) return "Pinterest";
    if (domain.includes("dribbble.com")) return "Dribbble";
    if (domain.includes("github.com")) return "GitHub";
    if (domain.includes("youtube.com") || domain.includes("youtu.be")) return "YouTube";
    if (domain.includes("twitter.com") || domain.includes("x.com")) return "Twitter/X";
    if (domain.includes("behance.net")) return "Behance";
    if (domain.includes("notion.so")) return "Notion";
    return "General";
  } catch {
    return "General";
  }
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
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "domain" | "details" | "type">(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("memory404-sort-by");
      if (stored === "newest" || stored === "oldest" || stored === "domain" || stored === "details" || stored === "type") {
        return stored as any;
      }
    }
    return "newest";
  });

  const setSortByAndPersist = (val: "newest" | "oldest" | "domain" | "details" | "type") => {
    setSortBy(val);
    try {
      window.localStorage.setItem("memory404-sort-by", val);
    } catch {}
  };

  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [savePhase, setSavePhase] = useState<"paste" | "place">("paste");
  const [placeGroupId, setPlaceGroupId] = useState<string | null>(null);
  const [newGroupNameDraft, setNewGroupNameDraft] = useState("");
  const [creatingNewGroup, setCreatingNewGroup] = useState(false);

  const [links, setLinks] = useState<LinkApiRow[]>(() => {
    try {
      const storedGroupId = window.localStorage.getItem("memory404-opened-group-id");
      const storedLinksCache = window.localStorage.getItem("memory404-links-cache");
      if (storedGroupId && storedLinksCache) {
        const cache = JSON.parse(storedLinksCache);
        return cache[storedGroupId] || [];
      }
    } catch {}
    return [];
  });
  const [loadingLinks, setLoadingLinks] = useState(() => {
    try {
      const storedGroupId = window.localStorage.getItem("memory404-opened-group-id");
      const storedLinksCache = window.localStorage.getItem("memory404-links-cache");
      if (storedGroupId && storedLinksCache) {
        const cache = JSON.parse(storedLinksCache);
        if (cache[storedGroupId]) return false;
      }
    } catch {}
    return true;
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>(
    {},
  );
  const [patchErrors, setPatchErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFailedId, setCopyFailedId] = useState<string | null>(null);

  const [groups, setGroups] = useState<GroupRow[]>(() => {
    try {
      const stored = window.localStorage.getItem("memory404-groups-cache");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem("memory404-opened-group-id");
    } catch {
      return null;
    }
  });
  const [openedGroupId, setOpenedGroupId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem("memory404-opened-group-id");
    } catch {
      return null;
    }
  });
  const [createGroupName, setCreateGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [addingAt, setAddingAt] = useState<number | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [openedLinkId, setOpenedLinkId] = useState<string | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<DOMRect | null>(null);
  const [gridSize, setGridSize] = useState<GridSize>("large");
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [linksCache, setLinksCache] = useState<Record<string, LinkApiRow[]>>(() => {
    try {
      const stored = window.localStorage.getItem("memory404-links-cache");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const linksCacheRef = useRef(linksCache);
  useEffect(() => {
    linksCacheRef.current = linksCache;
  }, [linksCache]);
  const groupInputRef = useRef<HTMLInputElement | null>(null);
  const groupSizerRef = useRef<HTMLSpanElement | null>(null);
  const [groupInputWidth, setGroupInputWidth] = useState(GROUP_PILL_MIN_PX);

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
      groupId && groupId !== "all"
        ? apiUrl(`/api/links?groupId=${encodeURIComponent(groupId)}`)
        : apiUrl("/api/links"),
    [],
  );

  const hasPendingMetadata = links.some((l) => l.metadata_status === "pending");

  // useSWR for groups/folders
  const { data: swrGroups, mutate: mutateGroups } = useSWR(
    apiUrl("/api/groups"),
    async (url) => {
      setGroupsError(null);
      try {
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = typeof data.error === "string" ? data.error : "Failed to load groups";
          setGroupsError(msg);
          throw new Error(msg);
        }
        return Array.isArray(data.groups) ? (data.groups as GroupRow[]) : [];
      } catch (err: any) {
        setGroupsError(err.message || "Failed to load groups");
        throw err;
      }
    }
  );

  // useSWR for links of current group
  const { data: swrLinks, mutate: mutateSWRLinks, isValidating: swrValidating } = useSWR(
    openedGroupId ? linksListUrl(openedGroupId) : null,
    async (url) => {
      setFetchError(null);
      try {
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = typeof data.error === "string" ? data.error : "Failed to load links";
          const hint = typeof data.hint === "string" && data.hint.trim() ? ` — ${data.hint.trim()}` : "";
          const fullMsg = `${msg}${hint}`;
          setFetchError(fullMsg);
          throw new Error(fullMsg);
        }
        return Array.isArray(data.links) ? (data.links as LinkApiRow[]) : [];
      } catch (err: any) {
        setFetchError(err.message || "Failed to load links");
        throw err;
      }
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      refreshInterval: hasPendingMetadata ? 3000 : 0
    }
  );

  // Sync SWR groups to local state
  useEffect(() => {
    if (swrGroups) {
      setGroups(swrGroups);
      try {
        window.localStorage.setItem("memory404-groups-cache", JSON.stringify(swrGroups));
      } catch {}

      const general =
        swrGroups.find(
          (g) =>
            g.name.trim().toLowerCase() ===
            GENERAL_GROUP_NAME.toLowerCase(),
        ) ?? swrGroups[0];
      if (general) {
        setSelectedGroupId((prev) => prev ?? general.id);
        setOpenedGroupId((prev) => {
          const next = prev ?? general.id;
          try {
            window.localStorage.setItem("memory404-opened-group-id", next);
          } catch {}
          return next;
        });
      }
    }
  }, [swrGroups]);

  // Sync SWR links to local state
  useEffect(() => {
    if (swrLinks) {
      setLinks(swrLinks);
      if (openedGroupId) {
        setLinksCache((prev) => {
          const next = { ...prev, [openedGroupId]: swrLinks };
          try {
            window.localStorage.setItem("memory404-links-cache", JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    }
  }, [swrLinks, openedGroupId]);

  // Sync SWR validation status to loadingLinks
  useEffect(() => {
    const cached = linksCacheRef.current[openedGroupId || ""];
    if (cached) {
      setLoadingLinks(false);
    } else {
      setLoadingLinks(swrValidating);
    }
  }, [swrValidating, openedGroupId]);

  // Maintain wrappers for manual callbacks to trigger SWR refetches
  const loadGroups = useCallback(() => {
    return mutateGroups();
  }, [mutateGroups]);

  const loadLinks = useCallback(() => {
    return mutateSWRLinks();
  }, [mutateSWRLinks]);

  // Hydrate from cache instantly when switching groups
  useEffect(() => {
    if (openedGroupId) {
      const cached = linksCacheRef.current[openedGroupId];
      if (cached) {
        setLinks(cached);
      } else {
        setLinks([]);
      }
    }
  }, [openedGroupId]);

  const openedGroup = groups.find((g) => g.id === openedGroupId) ?? null;

  const generalGroup =
    groups.find(
      (group) =>
        group.name.trim().toLowerCase() === GENERAL_GROUP_NAME.toLowerCase(),
    ) ?? null;
  const folderGroups = groups.filter((group) => group.id !== generalGroup?.id);
  const filteredFolders = (() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return folderGroups;
    return folderGroups.filter((group) => group.name.toLowerCase().includes(q));
  })();
  const sortedLinks = useMemo(() => {
    const list = [...links];
    if (sortBy === "newest") {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortBy === "oldest") {
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    if (sortBy === "domain") {
      return list.sort((a, b) => getLinkDomain(a.url).localeCompare(getLinkDomain(b.url)));
    }
    if (sortBy === "details") {
      const getDetailSize = (l: LinkApiRow) => {
        const descLen = l.description?.length ?? 0;
        const notesLen = l.notes?.length ?? 0;
        const titleLen = (l.customTitle ?? l.title ?? "").length;
        return descLen + notesLen + titleLen;
      };
      return list.sort((a, b) => getDetailSize(b) - getDetailSize(a));
    }
    if (sortBy === "type") {
      const typeOrder: Record<string, number> = {
        "Figma": 1,
        "Pinterest": 2,
        "Dribbble": 3,
        "GitHub": 4,
        "YouTube": 5,
        "Twitter/X": 6,
        "Behance": 7,
        "Notion": 8,
        "General": 9
      };
      return list.sort((a, b) => {
        const typeA = getLinkType(a.url);
        const typeB = getLinkType(b.url);
        const orderA = typeOrder[typeA] ?? 99;
        const orderB = typeOrder[typeB] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return list;
  }, [links, sortBy]);
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

    let hostname = "";
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    }

    const tempId = `optimistic-${Date.now()}`;
    const draftLink: LinkApiRow = {
      id: tempId,
      url,
      title: hostname,
      custom_title: null,
      customTitle: null,
      display_title: hostname,
      description: "Saving link...",
      image_url: "",
      favicon_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`,
      faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`,
      tags: [],
      notes: null,
      group_id: groupId ?? "",
      groupId: groupId ?? "",
      metadata_status: "pending",
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isPending: true,
    };

    const originalLinks = links;

    // Optimistically add to UI links array if target group is currently open
    if (groupId === openedGroupId && !trimmedNew) {
      setLinks((prev) => [draftLink, ...prev]);
    }

    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveLink(url, groupId ?? "", {
        newGroupName: trimmedNew || undefined,
      });
      if (!result.ok) {
        setSaveError(result.error);
        if (groupId === openedGroupId && !trimmedNew) {
          setLinks(originalLinks);
        }
        return;
      }
      resetSaveForm();
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
      const row = result.link;

      // Update UI with final saved row
      if (row.groupId === openedGroupId) {
        setLinks((prev) => [row, ...prev.filter((l) => l.id !== tempId && l.id !== row.id)]);
      } else {
        setLinks((prev) => prev.filter((l) => l.id !== tempId));
        void loadLinks();
      }

      // Update linksCache
      if (openedGroupId) {
        setLinksCache((prev) => {
          const groupLinks = prev[openedGroupId] || [];
          const updatedGroupLinks = groupLinks.filter((l) => l.id !== tempId);
          const next = {
            ...prev,
            [openedGroupId]: updatedGroupLinks
          };
          if (row.groupId === openedGroupId) {
            next[openedGroupId] = [row, ...next[openedGroupId].filter((l) => l.id !== row.id)];
          } else if (row.groupId) {
            next[row.groupId] = [row, ...(next[row.groupId] || []).filter((l) => l.id !== row.id)];
          }
          try {
            window.localStorage.setItem("memory404-links-cache", JSON.stringify(next));
          } catch {}
          return next;
        });
      }
      void loadGroups();
    } catch {
      if (groupId === openedGroupId && !trimmedNew) {
        setLinks(originalLinks);
      }
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

    const originalLinks = links;

    // Optimistically remove from UI state
    setLinks((prev) => prev.filter((l) => l.id !== id));
    if (openedLinkId === id) {
      setOpenedLinkId(null);
      setOverlayOrigin(null);
    }

    try {
      const res = await fetch(apiUrl(`/api/links/${id}`), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Rollback state if server returns error!
        setLinks(originalLinks);
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
      
      // Update cache
      if (openedGroupId) {
        setLinksCache((prev) => {
          const next = {
            ...prev,
            [openedGroupId]: (prev[openedGroupId] || []).filter((l) => l.id !== id),
          };
          try {
            window.localStorage.setItem("memory404-links-cache", JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    } catch {
      // Rollback state if server returns error!
      setLinks(originalLinks);
      setDeleteErrors((prev) => ({
        ...prev,
        [id]: "Network error — failed to delete",
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

    const originalLinks = links;
    
    // Optimistic UI updates
    if (nextGroupId !== openedGroupId) {
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      if (openedLinkId === link.id) {
        setOpenedLinkId(null);
        setOverlayOrigin(null);
      }
    } else {
      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id ? { ...l, groupId: nextGroupId } : l,
        ),
      );
    }

    try {
      const res = await fetch(apiUrl(`/api/links/${link.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: nextGroupId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Rollback state if server returns error!
        setLinks(originalLinks);
        const msg =
          typeof data.error === "string" ? data.error : "Failed to move link";
        setPatchErrors((p) => ({ ...p, [link.id]: msg }));
        return;
      }
      
      const updatedLink = data.link ? (data.link as LinkApiRow) : { ...link, groupId: nextGroupId };
      
      // Update cache
      setLinksCache((prev) => {
        const next = { ...prev };
        // Remove from old group in cache
        if (link.groupId && next[link.groupId]) {
          next[link.groupId] = next[link.groupId].filter((l) => l.id !== link.id);
        }
        // Add to new group in cache
        if (nextGroupId && next[nextGroupId]) {
          next[nextGroupId] = [updatedLink, ...(next[nextGroupId].filter((l) => l.id !== link.id))];
        }
        try {
          window.localStorage.setItem("memory404-links-cache", JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch {
      // Rollback state if server returns error!
      setLinks(originalLinks);
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
    const insertAt =
      (addingAt ?? folderGroups.length) + (generalGroup ? 1 : 0);
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
    setAddingAt(at);
    setCreateGroupName("");
    setGroupsError(null);
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

  const openedLink = sortedLinks.find((l) => l.id === openedLinkId) ?? null;
  const openedLinkIndex = openedLink
    ? sortedLinks.findIndex((l) => l.id === openedLink.id)
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
    setOpenedLinkId(sortedLinks[openedLinkIndex - 1].id);
  };

  const goNextLink = () => {
    if (openedLinkIndex < 0 || openedLinkIndex >= sortedLinks.length - 1) return;
    setOverlayOrigin(null);
    setOpenedLinkId(sortedLinks[openedLinkIndex + 1].id);
  };

  const selectGroup = (id: string) => {
    setSelectedGroupId(id);
    setOpenedGroupId(id);
    try {
      window.localStorage.setItem("memory404-opened-group-id", id);
    } catch {}
  };

  const persistFolderOrder = useCallback(async (orderedFolders: GroupRow[]) => {
    const previous = groups;
    const ordered = generalGroup
      ? [generalGroup, ...orderedFolders]
      : orderedFolders;
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
  }, [generalGroup, groups]);

  const fieldClass =
    "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-border-strong focus:ring-1 focus:ring-foreground/20";
  const pillBase =
    "inline-flex h-7 shrink-0 items-center rounded-full border border-transparent px-4 text-[13px] leading-none transition-colors select-none";
  const pillActive = `${pillBase} bg-pill-active text-pill-active-fg`;
  const pillIdle = `${pillBase} bg-pill text-muted hover:bg-pill-hover`;
  const canReorderPills = !groupSearch.trim() && addingAt == null;

  return (
    <div
      ref={pageRef}
      className="mx-auto flex min-h-screen w-full max-w-[var(--content-max)] flex-col gap-8 p-4 min-[1712px]:border-x min-[1712px]:border-border"
    >
      {/* Sidebar — recent.design layout */}
      <aside className="flex flex-col gap-6 lg:fixed lg:left-[max(1rem,calc((100vw-var(--content-max))/2+1rem))] lg:top-0 lg:z-[45] lg:box-border lg:h-dvh lg:w-[var(--sidebar-w)] lg:shrink-0 lg:items-stretch lg:gap-8 lg:py-4">
        <div className="flex flex-col items-start gap-3">
          <Link
            href="/"
            aria-label="memory404"
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
          </Link>
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

        <div className="flex flex-col gap-5 lg:mt-auto">
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
                      <AppLoader compact progressive label="saving" />
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

          <div className="hidden flex-col gap-2 lg:flex">
            <Link
              href="/settings"
              className="text-[13px] text-muted transition-colors hover:text-foreground"
            >
              Profile & billing
            </Link>
            <Link
              href="/workspace"
              className="text-[13px] text-muted transition-colors hover:text-foreground"
            >
              Screen studio
            </Link>
            <p className="text-[13px] text-subtle">
              © {new Date().getFullYear()} memory404
            </p>
          </div>
        </div>
      </aside>

      {/* Main feed */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[252px]">
        <main className="vault-enter relative z-30 flex min-w-0 flex-1 flex-col bg-background">
          <header className="-mr-4 flex flex-col gap-y-1 pr-4 pt-[17px] lg:-mt-4 lg:flex-row lg:items-baseline lg:justify-between lg:gap-x-4">
            <div className="flex flex-col gap-y-1 lg:min-w-0 lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-3 lg:gap-y-1">
              <h1 className="shrink-0 text-[15px] font-medium leading-normal text-foreground">
                <TextSwap>
                  {openedGroupId === "all" ? "All Links" : (openedGroup?.name ?? "memory404")}
                </TextSwap>
              </h1>
              <p className="min-w-0 text-balance text-[15px] text-subtle">
                Links you save, browsed like a dark inspiration feed.
              </p>
            </div>
            <span className="shrink-0 text-[13px] text-subtle">
              <TextSwap>
                {openedGroupId === "all"
                  ? `${links.length} link${links.length === 1 ? "" : "s"}`
                  : openedGroup
                  ? `${openedGroup.linksCount} link${openedGroup.linksCount === 1 ? "" : "s"}`
                  : ""}
              </TextSwap>
            </span>
          </header>

          {/* Sticky group pills */}
          <div className="sticky top-0 z-20 -mr-4 flex items-center justify-between gap-4 bg-background/95 pt-3 pb-4 pr-4 backdrop-blur-md">
            <div className="relative flex min-w-0 flex-1 items-center overflow-x-auto overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-3.5 -my-3.5">
              
              {/* Background dashed placeholder slots revealed during drag */}
              {draggingGroupId !== null && (
                <div className="absolute inset-0 flex items-center pointer-events-none z-0">
                  {generalGroup ? (
                    <div className="invisible shrink-0 px-4 text-[13px] h-7">
                      {generalGroup.name}
                    </div>
                  ) : null}
                  {generalGroup ? (
                    <span aria-hidden className="mx-2 h-5 w-px shrink-0 bg-transparent" />
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
              <span aria-hidden className="mx-2 h-5 w-px shrink-0 bg-border z-10 relative" />

              {generalGroup ? (
                <button
                  type="button"
                  aria-pressed={generalGroup.id === openedGroupId}
                  onClick={() => selectGroup(generalGroup.id)}
                  className={`z-10 relative ${
                    generalGroup.id === openedGroupId ? pillActive : pillIdle
                  }`}
                >
                  {generalGroup.name}
                </button>
              ) : null}
              {generalGroup ? (
                <span aria-hidden className="mx-2 h-5 w-px shrink-0 bg-border z-10 relative" />
              ) : null}
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
                    className="shrink-0"
                    onDragStart={() => setDraggingGroupId(g.id)}
                    onDragEnd={() => setDraggingGroupId(null)}
                    whileDrag={{
                      scale: 1.03,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    }}
                    transition={{
                      type: "tween",
                      ease: "easeInOut",
                      duration: 0.18,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => selectGroup(g.id)}
                      className={`${g.id === openedGroupId ? pillActive : pillIdle} transition-all duration-150 ${
                        draggingGroupId === g.id
                          ? "bg-surface-elevated/80 border-border-strong shadow-[0_0_12px_rgba(255,255,255,0.04)]"
                          : ""
                      }`}
                    >
                      {g.name}
                    </button>
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
                    className="h-7 shrink-0 rounded-full border border-dashed border-foreground/40 bg-surface px-2.5 text-[13px] leading-none text-foreground outline-none placeholder:text-subtle transition-[width] duration-100"
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
                onChange={(e) => setSortByAndPersist(e.target.value as any)}
                aria-label="Sort links"
                className="h-7 rounded-full border border-border bg-surface px-2.5 text-[12px] font-medium text-muted outline-none focus:border-border-strong hover:text-foreground cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="domain">Domain</option>
                <option value="type">Link Type</option>
                <option value="details">Details Size</option>
              </select>
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
                aria-label="Refresh"
                title="Refresh"
                className={`${pillIdle} justify-center px-2`}
              >
                <RotateCw className="size-3.5 -scale-x-100" strokeWidth={2} aria-hidden />
              </button>
            </div>
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
            <div className="py-6">
              <AppLoader progressive label="loading" />
            </div>
          ) : loadingLinks ? (
            <div className="py-6">
              <AppLoader progressive label="loading" />
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
                groupId={openedGroupId === "all" ? null : openedGroupId}
                saveLink={saveLink}
                onSaved={(row) => {
                  setLinks((prev) => [
                    row,
                    ...prev.filter((l) => l.id !== row.id),
                  ]);
                  void loadGroups();
                }}
              />
              {sortedLinks.map((link) => (
                <LinkCard key={link.id} link={link} onOpen={openLinkDetail} />
              ))}
            </div>
          )}
        </main>

        <p className="mt-8 shrink-0 text-[13px] text-subtle lg:hidden">
          © {new Date().getFullYear()} memory404
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
