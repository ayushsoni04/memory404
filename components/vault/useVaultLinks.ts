"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { apiUrl } from "@/lib/api-base";
import { clearCardRectsCache } from "@/lib/card-vicinity-stroke";
import type { LinkApiRow } from "@/lib/links";
import { sortLinks } from "./link-utils";
import {
  readJsonStorage,
  readStorageItem,
  writeLinksCacheToStorage,
} from "./storage";
import {
  LINKS_PAGE_SIZE,
  PENDING_POLL_MAX_AGE_MS,
  type LinksPage,
  type SortBy,
} from "./types";

type InitialVaultLinks = {
  openedGroupId: string;
  firstPage: LinksPage;
};

export function useVaultLinks(
  openedGroupId: string | null,
  sortBy: SortBy,
  initialData: InitialVaultLinks,
) {
  const initialMatches = openedGroupId === initialData.openedGroupId;
  const initialFirstPage = initialData.firstPage;
  const fallbackData = useMemo(
    () => (initialMatches ? [initialFirstPage] : undefined),
    [initialMatches, initialFirstPage],
  );
  const [links, setLinks] = useState<LinkApiRow[]>(() => {
    if (initialMatches) return initialData.firstPage.links;
    const storedGroupId = readStorageItem("memory404-opened-group-id");
    const cache = readJsonStorage<Record<string, LinkApiRow[]>>(
      "memory404-links-cache",
      {},
    );
    if (storedGroupId && cache[storedGroupId]) return cache[storedGroupId];
    return [];
  });
  const [loadingLinks, setLoadingLinks] = useState(() => {
    if (initialMatches) return false;
    const storedGroupId = readStorageItem("memory404-opened-group-id");
    const cache = readJsonStorage<Record<string, LinkApiRow[]>>(
      "memory404-links-cache",
      {},
    );
    return !(storedGroupId && cache[storedGroupId]);
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreLinks, setHasMoreLinks] = useState(
    initialMatches ? initialData.firstPage.hasMore : true,
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLockRef = useRef(false);
  const [linksCache, setLinksCache] = useState<Record<string, LinkApiRow[]>>(
    () => ({
      ...readJsonStorage<Record<string, LinkApiRow[]>>(
        "memory404-links-cache",
        {},
      ),
      [initialData.openedGroupId]: initialData.firstPage.links,
    }),
  );

  const linksCacheRef = useRef(linksCache);
  useEffect(() => {
    linksCacheRef.current = linksCache;
  }, [linksCache]);

  const linksListUrl = useCallback(
    (groupId: string | null, cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set("limit", String(LINKS_PAGE_SIZE));
      if (groupId && groupId !== "all") {
        params.set("groupId", groupId);
      }
      if (cursor) params.set("cursor", cursor);
      return apiUrl(`/api/links?${params.toString()}`);
    },
    [],
  );

  const getLinksPageKey = useCallback(
    (pageIndex: number, previousPageData: LinksPage | null) => {
      if (!openedGroupId) return null;
      if (previousPageData && !previousPageData.hasMore) return null;
      const cursor =
        pageIndex === 0 ? null : (previousPageData?.nextCursor ?? null);
      if (pageIndex > 0 && !cursor) return null;
      return linksListUrl(openedGroupId, cursor);
    },
    [openedGroupId, linksListUrl],
  );

  const {
    data: swrLinkPages,
    error: swrLinksError,
    mutate: mutateSWRLinks,
    size: linkPageCount,
    setSize: setLinkPageCount,
    isValidating: swrValidating,
    isLoading: swrLinksLoading,
  } = useSWRInfinite<LinksPage>(
    getLinksPageKey,
    async (url: string) => {
      setFetchError(null);
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to load links";
        const hint =
          typeof data.hint === "string" && data.hint.trim()
            ? ` — ${data.hint.trim()}`
            : "";
        const fullMsg = `${msg}${hint}`;
        setFetchError(fullMsg);
        throw new Error(fullMsg);
      }
      const pageLinks = Array.isArray(data.links)
        ? (data.links as LinkApiRow[])
        : [];
      return {
        links: pageLinks,
        nextCursor:
          typeof data.nextCursor === "string" ? data.nextCursor : null,
        hasMore: Boolean(data.hasMore),
      };
    },
    {
      fallbackData,
      revalidateOnMount: !initialMatches,
      revalidateOnFocus: false,
      revalidateFirstPage: false,
      dedupingInterval: 2000,
      persistSize: false,
    },
  );

  useEffect(() => {
    if (!swrLinkPages) return;
    const flat = swrLinkPages.flatMap((page) => page.links);
    const seen = new Set<string>();
    const deduped: LinkApiRow[] = [];
    for (const link of flat) {
      if (seen.has(link.id)) continue;
      seen.add(link.id);
      deduped.push(link);
    }
    setLinks(deduped);
    const lastPage = swrLinkPages[swrLinkPages.length - 1];
    setHasMoreLinks(Boolean(lastPage?.hasMore));
    if (openedGroupId) {
      setLinksCache((prev) => {
        const firstPage = swrLinkPages[0]?.links ?? [];
        const next = { ...prev, [openedGroupId]: firstPage };
        writeLinksCacheToStorage(next);
        return next;
      });
    }
  }, [swrLinkPages, openedGroupId]);

  useEffect(() => {
    if (swrLinksError) {
      const msg =
        swrLinksError instanceof Error
          ? swrLinksError.message
          : "Failed to load links";
      setFetchError(msg);
    }
  }, [swrLinksError]);

  useEffect(() => {
    const cached = linksCacheRef.current[openedGroupId || ""];
    const hasPages = Boolean(swrLinkPages?.length);
    if (cached?.length && !hasPages) {
      setLoadingLinks(false);
    } else {
      setLoadingLinks(swrLinksLoading || (swrValidating && !hasPages));
    }
    setLoadingMore(
      swrValidating && linkPageCount > 1 && Boolean(swrLinkPages?.length),
    );
  }, [
    swrValidating,
    swrLinksLoading,
    openedGroupId,
    linkPageCount,
    swrLinkPages,
  ]);

  useEffect(() => {
    setLinkPageCount(1);
    setHasMoreLinks(
      openedGroupId === initialData.openedGroupId
        ? initialData.firstPage.hasMore
        : true,
    );
    loadMoreLockRef.current = false;
  }, [
    initialData.firstPage.hasMore,
    initialData.openedGroupId,
    openedGroupId,
    setLinkPageCount,
  ]);

  // Age window is intentionally evaluated when `links` changes (same as pre-split).
  // eslint-disable-next-line react-hooks/purity -- cutoff is relative to poll refresh cycles
  const pendingPollCutoff = Date.now() - PENDING_POLL_MAX_AGE_MS;
  const pendingPollIds = useMemo(() => {
    return links
      .filter((l) => {
        if (l.metadataStatus !== "pending") return false;
        if (l.id.startsWith("optimistic-")) return false;
        const created = new Date(l.createdAt).getTime();
        return Number.isFinite(created) && created >= pendingPollCutoff;
      })
      .map((l) => l.id)
      .slice(0, 40);
  }, [links, pendingPollCutoff]);

  const pendingPollKey =
    pendingPollIds.length > 0
      ? apiUrl(`/api/links?ids=${pendingPollIds.join(",")}`)
      : null;

  useSWR(
    pendingPollKey,
    async (url: string) => {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return [] as LinkApiRow[];
      return Array.isArray(data.links) ? (data.links as LinkApiRow[]) : [];
    },
    {
      refreshInterval: 4000,
      revalidateOnFocus: false,
      dedupingInterval: 3000,
      onSuccess: (fresh) => {
        if (!fresh.length) return;
        const byId = new Map(fresh.map((l) => [l.id, l]));
        void mutateSWRLinks(
          (pages) => {
            if (!pages) return pages;
            return pages.map((page) => ({
              ...page,
              links: page.links.map((l) => byId.get(l.id) ?? l),
            }));
          },
          { revalidate: false },
        );
      },
    },
  );

  const loadLinks = useCallback(() => {
    return mutateSWRLinks();
  }, [mutateSWRLinks]);

  const prependLinkToPages = useCallback(
    (row: LinkApiRow) => {
      void mutateSWRLinks(
        (pages) => {
          if (!pages?.length) {
            return [
              {
                links: [row],
                nextCursor: null,
                hasMore: false,
              },
            ];
          }
          const [first, ...rest] = pages;
          return [
            {
              ...first,
              links: [row, ...first.links.filter((l) => l.id !== row.id)],
            },
            ...rest,
          ];
        },
        { revalidate: false },
      );
    },
    [mutateSWRLinks],
  );

  const removeLinkFromPages = useCallback(
    (id: string) => {
      void mutateSWRLinks(
        (pages) =>
          pages?.map((page) => ({
            ...page,
            links: page.links.filter((l) => l.id !== id),
          })),
        { revalidate: false },
      );
    },
    [mutateSWRLinks],
  );

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

  const sortedLinks = useMemo(
    () => sortLinks(links, sortBy),
    [links, sortBy],
  );

  const sortedLinkIdsRef = useRef<string>("");
  useEffect(() => {
    const ids = sortedLinks.map((l) => l.id).join(",");
    if (ids !== sortedLinkIdsRef.current) {
      sortedLinkIdsRef.current = ids;
      clearCardRectsCache();
    }
  }, [sortedLinks]);

  const loadMoreLinks = useCallback(() => {
    if (!hasMoreLinks || loadingMore || loadMoreLockRef.current) return;
    loadMoreLockRef.current = true;
    void setLinkPageCount((n) => n + 1).finally(() => {
      loadMoreLockRef.current = false;
    });
  }, [hasMoreLinks, loadingMore, setLinkPageCount]);

  useEffect(() => {
    if (!hasMoreLinks) return;
    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreLinks();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(currentSentinel);
    return () => {
      observer.unobserve(currentSentinel);
    };
  }, [hasMoreLinks, loadMoreLinks, sortedLinks.length]);

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

  return {
    links,
    setLinks,
    loadingLinks,
    fetchError,
    loadingMore,
    hasMoreLinks,
    sentinelRef,
    linksCache,
    setLinksCache,
    sortedLinks,
    loadLinks,
    prependLinkToPages,
    removeLinkFromPages,
    saveLink,
  };
}
