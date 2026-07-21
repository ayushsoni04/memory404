"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import AddLinkCard from "@/components/AddLinkCard";
import LinkCard from "@/components/LinkCard";
import TextSwap from "@/components/TextSwap";
import type { LinkApiRow } from "@/lib/links";
import type { FeedItem } from "./FeedGrid";
import { useResponsiveColumnCount } from "./use-responsive-columns";
import type { GridSize, GroupRow } from "./types";

const FeedGrid = dynamic(() => import("./FeedGrid"), {
  ssr: false,
  loading: () => (
    <div className="mind-grid" data-grid-size="default">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="mb-3 break-inside-avoid animate-pulse">
          <div className="rounded-[4px] bg-surface-elevated p-[1px] border border-border/30">
            <div className="w-full aspect-[16/10] rounded-[4px] bg-neutral-800/30" />
          </div>
          <div className="mt-2 px-0.5 space-y-1">
            <div className="h-3.5 w-4/5 rounded bg-neutral-800/40" />
            <div className="h-3 w-2/5 rounded bg-neutral-800/25" />
          </div>
        </div>
      ))}
    </div>
  ),
});

type SaveLinkResult =
  | { ok: true; link: LinkApiRow }
  | { ok: false; error: string };

type VaultFeedProps = {
  groupToolbar: React.ReactNode;
  openedGroupId: string | null;
  openedGroup: GroupRow | null;
  allLinksCount: number;
  groupsError: string | null;
  loadGroups: () => Promise<unknown>;
  loadingLinks: boolean;
  fetchError: string | null;
  loadLinks: () => Promise<unknown>;
  gridSize: GridSize;
  generalGroup: GroupRow | null;
  saveLink: (
    url: string,
    groupId: string,
    options?: { newGroupName?: string },
  ) => Promise<SaveLinkResult>;
  onLinkSaved: (row: LinkApiRow) => void;
  enteringLinkId: string | null;
  sortedLinks: LinkApiRow[];
  openLinkDetail: (link: LinkApiRow, originEl: HTMLElement) => void;
  feedImageSizes: string;
  hasMoreLinks: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
};

export default function VaultFeed({
  groupToolbar,
  openedGroupId,
  openedGroup,
  allLinksCount,
  groupsError,
  loadGroups,
  loadingLinks,
  fetchError,
  loadLinks,
  gridSize,
  generalGroup,
  saveLink,
  onLinkSaved,
  enteringLinkId,
  sortedLinks,
  openLinkDetail,
  feedImageSizes,
  hasMoreLinks,
  sentinelRef,
}: VaultFeedProps) {
  const columnCount = useResponsiveColumnCount(gridSize);
  const addLinkGroupId =
    openedGroupId === "all" ? (generalGroup?.id ?? null) : openedGroupId;

  const items = useMemo<FeedItem[]>(
    () => [
      { kind: "add-link" },
      ...sortedLinks.map((link, index) => ({
        kind: "link" as const,
        link,
        priority: index < 2,
      })),
    ],
    [sortedLinks],
  );

  const renderItem = useCallback(
    ({ data }: { index: number; width: number; data: FeedItem }) => {
      if (data.kind === "add-link") {
        return (
          <AddLinkCard
            groupId={addLinkGroupId}
            saveLink={saveLink}
            onSaved={onLinkSaved}
          />
        );
      }
      return (
        <LinkCard
          link={data.link}
          entering={data.link.id === enteringLinkId}
          onOpen={openLinkDetail}
          priority={data.priority}
          imageSizes={feedImageSizes}
        />
      );
    },
    [
      addLinkGroupId,
      saveLink,
      onLinkSaved,
      enteringLinkId,
      openLinkDetail,
      feedImageSizes,
    ],
  );

  const itemKey = useCallback(
    (data: FeedItem) => (data.kind === "add-link" ? "add-link" : data.link.id),
    [],
  );

  return (
    <main className="vault-enter relative z-30 flex min-w-0 flex-1 flex-col bg-background">
      <header className="-mr-4 flex flex-col gap-y-1 pr-4 pt-[17px] lg:-mt-4 lg:flex-row lg:items-baseline lg:justify-between lg:gap-x-4">
        <div className="flex flex-col gap-y-1 lg:min-w-0 lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-3 lg:gap-y-1">
          <h1 className="shrink-0 text-[15px] font-medium leading-normal text-foreground">
            <TextSwap>
              {openedGroupId === "all"
                ? "All Links"
                : (openedGroup?.name ?? "memory404")}
            </TextSwap>
          </h1>
          <p className="min-w-0 text-balance text-[15px] text-subtle">
            Links you save, browsed like a dark inspiration feed.
          </p>
        </div>
        <span className="shrink-0 text-[13px] text-subtle">
          <TextSwap>
            {openedGroupId === "all"
              ? `${allLinksCount} link${allLinksCount === 1 ? "" : "s"}`
              : openedGroup
                ? `${openedGroup.linksCount} link${openedGroup.linksCount === 1 ? "" : "s"}`
                : ""}
          </TextSwap>
        </span>
      </header>

      {groupToolbar}

      {!openedGroupId && groupsError ? (
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
      ) : !openedGroupId || loadingLinks ? (
        <div className="mind-grid" data-grid-size={gridSize}>
          {Array.from({ length: 12 }).map((_, i) => {
            return (
              <div key={i} className="mb-3 break-inside-avoid animate-pulse">
                <div className="rounded-[4px] bg-surface-elevated p-[1px] border border-border/30">
                  <div className="w-full aspect-[16/10] rounded-[4px] bg-neutral-800/30" />
                </div>
                <div className="mt-2 px-0.5 space-y-1">
                  <div className="h-3.5 w-4/5 rounded bg-neutral-800/40" />
                  <div className="h-3 w-2/5 rounded bg-neutral-800/25" />
                </div>
              </div>
            );
          })}
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
        <>
          <FeedGrid
            gridSize={gridSize}
            columnCount={columnCount}
            items={items}
            itemKey={itemKey}
            render={renderItem}
          />
          {hasMoreLinks && (
            <div
              ref={sentinelRef}
              className="mt-8 flex w-full justify-center pb-12"
              aria-hidden
            >
              <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-800/40" />
            </div>
          )}
        </>
      )}
    </main>
  );
}
