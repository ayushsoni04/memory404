"use client";

import { useCallback, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import type { LinkApiRow } from "@/lib/links";
import { copyTextToClipboard } from "./link-utils";
import { cacheAfterMove, linkStaysInOpenGroup } from "./move-link";
import { writeLinksCacheToStorage } from "./storage";

type UseLinkActionsDeps = {
  links: LinkApiRow[];
  setLinks: React.Dispatch<React.SetStateAction<LinkApiRow[]>>;
  openedGroupId: string | null;
  setLinksCache: React.Dispatch<
    React.SetStateAction<Record<string, LinkApiRow[]>>
  >;
  removeLinkFromPages: (id: string) => void;
  replaceLinkInPages: (link: LinkApiRow) => void;
  loadGroups?: () => Promise<unknown>;
  sortedLinks: LinkApiRow[];
};

export function useLinkActions({
  links,
  setLinks,
  openedGroupId,
  setLinksCache,
  removeLinkFromPages,
  replaceLinkInPages,
  loadGroups,
  sortedLinks,
}: UseLinkActionsDeps) {
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [patchErrors, setPatchErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFailedId, setCopyFailedId] = useState<string | null>(null);

  const [openedLink, setOpenedLink] = useState<LinkApiRow | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<DOMRect | null>(null);

  const openedLinkIndex = useMemo(
    () =>
      openedLink ? sortedLinks.findIndex((l) => l.id === openedLink.id) : -1,
    [openedLink, sortedLinks],
  );

  // Keep overlay link in sync when the row updates (e.g. move/rename) without closing.
  const openedLinkLive = useMemo(() => {
    if (!openedLink) return null;
    return sortedLinks.find((l) => l.id === openedLink.id) ?? openedLink;
  }, [openedLink, sortedLinks]);

  const openLinkDetail = useCallback(
    (link: LinkApiRow, originEl: HTMLElement) => {
      setOverlayOrigin(originEl.getBoundingClientRect());
      setOpenedLink(link);
    },
    [],
  );

  const updateSavedLink = useCallback(
    (updated: LinkApiRow) => {
      setLinks((prev) => prev.map((link) => (link.id === updated.id ? updated : link)));
      setLinksCache((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const key of Object.keys(prev)) {
          next[key] = prev[key].map((link) => {
            if (link.id !== updated.id) return link;
            changed = true;
            return updated;
          });
        }
        if (changed) writeLinksCacheToStorage(next);
        return changed ? next : prev;
      });
      setOpenedLink((current) => (current?.id === updated.id ? updated : current));
    },
    [setLinks, setLinksCache],
  );

  const closeLinkDetail = useCallback(() => {
    setOpenedLink(null);
    setOverlayOrigin(null);
  }, []);

  const goPrevLink = useCallback(() => {
    if (!openedLink) return;
    const idx = sortedLinks.findIndex((l) => l.id === openedLink.id);
    if (idx <= 0) return;
    setOverlayOrigin(null);
    setOpenedLink(sortedLinks[idx - 1]);
  }, [openedLink, sortedLinks]);

  const goNextLink = useCallback(() => {
    if (!openedLink) return;
    const idx = sortedLinks.findIndex((l) => l.id === openedLink.id);
    if (idx < 0 || idx >= sortedLinks.length - 1) return;
    setOverlayOrigin(null);
    setOpenedLink(sortedLinks[idx + 1]);
  }, [openedLink, sortedLinks]);

  const handleDelete = async (id: string) => {
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const originalLinks = links;

    setLinks((prev) => prev.filter((l) => l.id !== id));

    try {
      const res = await fetch(apiUrl(`/api/links/${id}`), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
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

      if (openedLink?.id === id) {
        setOpenedLink(null);
        setOverlayOrigin(null);
      }

      if (openedGroupId) {
        setLinksCache((prev) => {
          const next = {
            ...prev,
            [openedGroupId]: (prev[openedGroupId] || []).filter(
              (l) => l.id !== id,
            ),
          };
          writeLinksCacheToStorage(next);
          return next;
        });
      }
      removeLinkFromPages(id);
    } catch {
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
    const stays = linkStaysInOpenGroup(openedGroupId, nextGroupId);
    const optimistic = { ...link, groupId: nextGroupId };

    if (stays) {
      setLinks((prev) =>
        prev.map((item) => (item.id === link.id ? optimistic : item)),
      );
    } else {
      setLinks((prev) => prev.filter((item) => item.id !== link.id));
    }

    try {
      const res = await fetch(apiUrl(`/api/links/${link.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: nextGroupId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinks(originalLinks);
        const msg =
          typeof data.error === "string" ? data.error : "Failed to move link";
        setPatchErrors((p) => ({ ...p, [link.id]: msg }));
        return;
      }

      const updatedLink = data.link
        ? (data.link as LinkApiRow)
        : optimistic;

      setLinksCache((prev) => {
        const next = cacheAfterMove(prev, link.id, updatedLink);
        if (next !== prev) writeLinksCacheToStorage(next);
        return next;
      });
      if (stays) {
        setLinks((prev) =>
          prev.map((item) => (item.id === link.id ? updatedLink : item)),
        );
        replaceLinkInPages(updatedLink);
      } else {
        if (openedLink?.id === link.id) {
          setOpenedLink(null);
          setOverlayOrigin(null);
        }
        removeLinkFromPages(link.id);
      }
      void loadGroups?.();
    } catch {
      setLinks(originalLinks);
      setPatchErrors((p) => ({
        ...p,
        [link.id]: "Network error — try again",
      }));
    }
  };

  return {
    deleteErrors,
    patchErrors,
    copiedId,
    copyFailedId,
    openedLink: openedLinkLive,
    openedLinkIndex,
    overlayOrigin,
    openLinkDetail,
    updateSavedLink,
    closeLinkDetail,
    goPrevLink,
    goNextLink,
    handleDelete,
    copyLinkUrl,
    moveLinkToGroup,
  };
}
