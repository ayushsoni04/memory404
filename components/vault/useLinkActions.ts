"use client";

import { useCallback, useMemo, useState } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { apiUrl } from "@/lib/api-base";
import type { LinkApiRow } from "@/lib/links";
import { copyTextToClipboard } from "./link-utils";
import { writeLinksCacheToStorage } from "./storage";

type UseLinkActionsDeps = {
  router: AppRouterInstance;
  links: LinkApiRow[];
  setLinks: React.Dispatch<React.SetStateAction<LinkApiRow[]>>;
  openedGroupId: string | null;
  setLinksCache: React.Dispatch<
    React.SetStateAction<Record<string, LinkApiRow[]>>
  >;
  removeLinkFromPages: (id: string) => void;
  sortedLinks: LinkApiRow[];
};

export function useLinkActions({
  router,
  links,
  setLinks,
  openedGroupId,
  setLinksCache,
  removeLinkFromPages,
  sortedLinks,
}: UseLinkActionsDeps) {
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [patchErrors, setPatchErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFailedId, setCopyFailedId] = useState<string | null>(null);

  const [openedLinkId, setOpenedLinkId] = useState<string | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<DOMRect | null>(null);

  const openedLink = useMemo(
    () => sortedLinks.find((l) => l.id === openedLinkId) ?? null,
    [sortedLinks, openedLinkId],
  );
  const openedLinkIndex = useMemo(
    () =>
      openedLink ? sortedLinks.findIndex((l) => l.id === openedLink.id) : -1,
    [openedLink, sortedLinks],
  );

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
    if (openedLinkIndex < 0 || openedLinkIndex >= sortedLinks.length - 1)
      return;
    setOverlayOrigin(null);
    setOpenedLinkId(sortedLinks[openedLinkIndex + 1].id);
  };

  const handleDelete = async (id: string) => {
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const originalLinks = links;

    setLinks((prev) => prev.filter((l) => l.id !== id));
    if (openedLinkId === id) {
      setOpenedLinkId(null);
      setOverlayOrigin(null);
    }

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
      setTimeout(() => {
        router.push("/trash");
      }, 400);
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
        setLinks(originalLinks);
        const msg =
          typeof data.error === "string" ? data.error : "Failed to move link";
        setPatchErrors((p) => ({ ...p, [link.id]: msg }));
        return;
      }

      const updatedLink = data.link
        ? (data.link as LinkApiRow)
        : { ...link, groupId: nextGroupId };

      setLinksCache((prev) => {
        const next = { ...prev };
        if (link.groupId && next[link.groupId]) {
          next[link.groupId] = next[link.groupId].filter((l) => l.id !== link.id);
        }
        if (nextGroupId && next[nextGroupId]) {
          next[nextGroupId] = [
            updatedLink,
            ...next[nextGroupId].filter((l) => l.id !== link.id),
          ];
        }
        writeLinksCacheToStorage(next);
        return next;
      });
      if (nextGroupId !== openedGroupId) {
        removeLinkFromPages(link.id);
      }
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
    openedLink,
    openedLinkIndex,
    overlayOrigin,
    openLinkDetail,
    closeLinkDetail,
    goPrevLink,
    goNextLink,
    handleDelete,
    copyLinkUrl,
    moveLinkToGroup,
  };
}
