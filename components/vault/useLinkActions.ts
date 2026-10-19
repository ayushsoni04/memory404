"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import type { LinkApiRow } from "@/lib/links";
import { playUiSound } from "@/lib/ui-sound";
import { detailReturnFocusId } from "./detail-focus";
import { copyTextToClipboard } from "./link-utils";
import { cacheAfterMove, linkStaysInOpenGroup } from "./move-link";
import { writeLinksCacheToStorage } from "./storage";
import {
  cacheWithLink,
  deleteFailureNotice,
  deleteUndoMessage,
  moveFailureNotice,
  moveUndoMessage,
  UNDO_MS,
  type UndoNoticeModel,
} from "./undo-offer";

type UseLinkActionsDeps = {
  links: LinkApiRow[];
  setLinks: React.Dispatch<React.SetStateAction<LinkApiRow[]>>;
  openedGroupId: string | null;
  setLinksCache: React.Dispatch<
    React.SetStateAction<Record<string, LinkApiRow[]>>
  >;
  removeLinkFromPages: (id: string) => void;
  replaceLinkInPages: (link: LinkApiRow) => void;
  prependLinkToPages: (link: LinkApiRow) => void;
  loadGroups?: () => Promise<unknown>;
  sortedLinks: LinkApiRow[];
  groupLabel?: (groupId: string) => string;
};

export function useLinkActions({
  links,
  setLinks,
  openedGroupId,
  setLinksCache,
  removeLinkFromPages,
  replaceLinkInPages,
  prependLinkToPages,
  loadGroups,
  sortedLinks,
  groupLabel = () => "that group",
}: UseLinkActionsDeps) {
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [patchErrors, setPatchErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFailedId, setCopyFailedId] = useState<string | null>(null);

  const [openedLink, setOpenedLink] = useState<LinkApiRow | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<DOMRect | null>(null);
  const [undoNotice, setUndoNotice] = useState<UndoNoticeModel | null>(null);
  const undoToken = useRef(0);
  const undoTimer = useRef<number | null>(null);
  const movesInFlight = useRef(new Set<string>());
  const openedGroupIdRef = useRef(openedGroupId);
  const linksRef = useRef(links);
  const returnFocusId = useRef<string | null>(null);

  useEffect(() => {
    openedGroupIdRef.current = openedGroupId;
    linksRef.current = links;
  }, [openedGroupId, links]);

  const clearUndoTimer = () => {
    if (undoTimer.current !== null) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  };

  useEffect(() => () => clearUndoTimer(), []);

  const dismissUndo = useCallback(() => {
    clearUndoTimer();
    undoToken.current += 1;
    setUndoNotice(null);
  }, []);

  const showUndo = (
    message: string,
    perform: (() => Promise<boolean>) | null,
    error: string | null = null,
  ) => {
    const token = ++undoToken.current;
    clearUndoTimer();
    setUndoNotice({ token, message, error, busy: false, perform });
    if (error || !perform) return;
    undoTimer.current = window.setTimeout(() => {
      setUndoNotice((current) => (current?.token === token ? null : current));
    }, UNDO_MS);
  };

  const placeRestoredLink = (restored: LinkApiRow) => {
    const visible = linkStaysInOpenGroup(
      openedGroupIdRef.current,
      restored.groupId,
    );
    if (!visible) {
      setLinks((prev) => prev.filter((item) => item.id !== restored.id));
      removeLinkFromPages(restored.id);
    } else if (linksRef.current.some((item) => item.id === restored.id)) {
      setLinks((prev) =>
        prev.map((item) => (item.id === restored.id ? restored : item)),
      );
      replaceLinkInPages(restored);
    } else {
      setLinks((prev) => [restored, ...prev.filter((item) => item.id !== restored.id)]);
      prependLinkToPages(restored);
    }
    setLinksCache((prev) => {
      const next = visible
        ? cacheWithLink(cacheAfterMove(prev, restored.id, restored), restored)
        : cacheAfterMove(prev, restored.id, restored);
      if (next !== prev) writeLinksCacheToStorage(next);
      return next;
    });
    setOpenedLink((current) => (current?.id === restored.id ? restored : current));
    void loadGroups?.();
  };

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
      returnFocusId.current = detailReturnFocusId(originEl, link.id);
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

  useEffect(() => {
    if (openedLink) return;
    const id = returnFocusId.current;
    if (!id) return;
    returnFocusId.current = null;
    document.getElementById(id)?.focus();
  }, [openedLink]);

  const goPrevLink = useCallback(() => {
    if (!openedLink) return;
    const idx = sortedLinks.findIndex((l) => l.id === openedLink.id);
    if (idx <= 0) return;
    const next = sortedLinks[idx - 1];
    returnFocusId.current = `feed-card-${next.id}`;
    setOverlayOrigin(null);
    setOpenedLink(next);
  }, [openedLink, sortedLinks]);

  const goNextLink = useCallback(() => {
    if (!openedLink) return;
    const idx = sortedLinks.findIndex((l) => l.id === openedLink.id);
    if (idx < 0 || idx >= sortedLinks.length - 1) return;
    const next = sortedLinks[idx + 1];
    returnFocusId.current = `feed-card-${next.id}`;
    setOverlayOrigin(null);
    setOpenedLink(next);
  }, [openedLink, sortedLinks]);

  const handleDelete = async (id: string) => {
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const originalLinks = links;
    const removed = originalLinks.find((link) => link.id === id);

    setLinks((prev) => prev.filter((l) => l.id !== id));

    const reportDeleteFailure = (message: string) => {
      setLinks(originalLinks);
      setDeleteErrors((prev) => ({ ...prev, [id]: message }));
      showUndo(message, null, message);
    };

    try {
      const res = await fetch(apiUrl(`/api/links/${id}`), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportDeleteFailure(deleteFailureNotice(data));
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
      if (removed) {
        showUndo(deleteUndoMessage(), () => restoreDeleted(removed));
      }
    } catch {
      reportDeleteFailure(deleteFailureNotice(null, true));
    }
  };

  const restoreDeleted = async (link: LinkApiRow) => {
    try {
      const res = await fetch(apiUrl(`/api/trash/links/${link.id}`), {
        method: "PATCH",
      });
      if (!res.ok) return false;
      placeRestoredLink({ ...link, deletedAt: null });
      return true;
    } catch {
      return false;
    }
  };

  const undoMove = async (original: LinkApiRow) => {
    try {
      const res = await fetch(apiUrl(`/api/links/${original.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: original.groupId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return false;
      const restored =
        data.link && typeof data.link === "object"
          ? (data.link as LinkApiRow)
          : original;
      placeRestoredLink(restored);
      return true;
    } catch {
      return false;
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
    if (movesInFlight.current.has(link.id)) return;
    movesInFlight.current.add(link.id);
    try {
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
          const msg = moveFailureNotice(data);
          setPatchErrors((p) => ({ ...p, [link.id]: msg }));
          playUiSound("error");
          showUndo(msg, null, msg);
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
        showUndo(moveUndoMessage(groupLabel(nextGroupId)), () => undoMove(link));
      } catch {
        setLinks(originalLinks);
        const msg = moveFailureNotice(null, true);
        setPatchErrors((p) => ({ ...p, [link.id]: msg }));
        playUiSound("error");
        showUndo(msg, null, msg);
      }
    } finally {
      movesInFlight.current.delete(link.id);
    }
  };

  const runUndo = async () => {
    const current = undoNotice;
    if (!current || current.busy || current.error || !current.perform) return;
    clearUndoTimer();
    setUndoNotice({ ...current, busy: true });
    const ok = await current.perform();
    if (ok) {
      setUndoNotice(null);
      playUiSound("success");
      return;
    }
    setUndoNotice({
      ...current,
      busy: false,
      perform: null,
      error: "Couldn't undo that. Try again from Trash.",
    });
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
    undoNotice,
    runUndo,
    dismissUndo,
  };
}
