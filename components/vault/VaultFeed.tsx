"use client";

import AddLinkCard from "@/components/AddLinkCard";
import LinkCard from "@/components/LinkCard";
import TextSwap from "@/components/TextSwap";
import type { LinkApiRow } from "@/lib/links";
import FeedGrid from "./FeedGrid";
import PastePrompt from "./PastePrompt";
import type { GridSize, GroupRow } from "./types";

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
  const addLinkGroupId =
    openedGroupId === "all" ? (generalGroup?.id ?? null) : openedGroupId;

  return (
    <main className="vault-enter relative z-30 flex min-w-0 flex-1 flex-col bg-background">
      <header className="-mr-4 flex flex-col gap-y-1 pr-4 pt-[17px] lg:-mt-4 lg:flex-row lg:items-baseline lg:justify-between lg:gap-x-4">
        <div className="flex flex-col gap-y-1 lg:min-w-0 lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-3 lg:gap-y-1">
          <h1 className="font-departure shrink-0 text-[15px] font-medium leading-normal tracking-wide text-foreground uppercase">
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
      ) : sortedLinks.length === 0 ? (
        <PastePrompt
          variant="empty"
          groupId={addLinkGroupId}
          saveLink={saveLink}
          onSaved={onLinkSaved}
        />
      ) : (
        <>
          <FeedGrid gridSize={gridSize}>
            <AddLinkCard
              groupId={addLinkGroupId}
              saveLink={saveLink}
              onSaved={onLinkSaved}
            />
            {sortedLinks.map((link, index) => (
              <LinkCard
                key={link.id}
                link={link}
                entering={link.id === enteringLinkId}
                onOpen={openLinkDetail}
                priority={index < 2}
                imageSizes={feedImageSizes}
              />
            ))}
          </FeedGrid>
          {hasMoreLinks && (
            <div
              ref={sentinelRef}
              className="mt-8 flex w-full justify-center pb-12"
              aria-hidden
            >
              <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-800/40" />
            </div>
          )}
          {!hasMoreLinks ? (
            <PastePrompt
              variant="end"
              groupId={addLinkGroupId}
              saveLink={saveLink}
              onSaved={onLinkSaved}
            />
          ) : null}
        </>
      )}
    </main>
  );
}
