"use client";

import AddLinkCard from "@/components/AddLinkCard";
import LinkCard from "@/components/LinkCard";
import MorphText from "@/components/MorphText";
import { explainLoadError } from "@/lib/load-error";
import type { LinkApiRow } from "@/lib/links";
import FeedGrid from "./FeedGrid";
import { replaceFeedWithLoadError } from "./feed-load";
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
  missingGroupNotice: string | null;
  loadGroups: () => Promise<unknown>;
  loadingLinks: boolean;
  fetchError: string | null;
  loadMoreError: string | null;
  retryLoadMore: () => Promise<unknown>;
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
  scrollRootRef: React.RefObject<HTMLDivElement | null>;
};

export default function VaultFeed({
  groupToolbar,
  openedGroupId,
  openedGroup,
  allLinksCount,
  groupsError,
  missingGroupNotice,
  loadGroups,
  loadingLinks,
  fetchError,
  loadMoreError,
  retryLoadMore,
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
  scrollRootRef,
}: VaultFeedProps) {
  const addLinkGroupId =
    openedGroupId === "all" ? (generalGroup?.id ?? null) : openedGroupId;

  const groupsLoadMessage = explainLoadError(groupsError);
  const groupsFailedToLoad = Boolean(
    groupsError &&
      (groupsLoadMessage !== groupsError || /load groups/i.test(groupsError)),
  );
  const feedBody = groupsFailedToLoad && !loadingLinks && sortedLinks.length === 0 ? (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface-elevated p-6">
      <p className="text-sm text-foreground">Groups could not be loaded.</p>
      <p className="text-[13px] text-subtle">
        Check your connection, then try again.
      </p>
      <button
        type="button"
        onClick={() => void loadGroups()}
        className="inline-flex h-8 items-center justify-center rounded-full bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg transition-[transform,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97]"
      >
        Retry
      </button>
    </div>
  ) : !openedGroupId || loadingLinks ? (
    <div className="mind-grid" data-grid-size={gridSize} aria-busy="true" aria-label="Loading links">
      {Array.from({ length: 12 }).map((_, i) => {
        return (
          <div
            key={i}
            className="mind-card break-inside-avoid"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="vault-skeleton rounded-[4px] border border-border bg-surface-elevated p-[1px]">
              <div className="aspect-[16/10] w-full rounded-[4px] bg-neutral-800/50" />
            </div>
            <div className="mt-2 space-y-1.5 px-0.5">
              <div className="vault-skeleton h-3.5 w-[80%] rounded bg-neutral-800/55" />
              <div className="vault-skeleton h-3 w-[40%] rounded bg-neutral-800/40" />
            </div>
          </div>
        );
      })}
    </div>
  ) : replaceFeedWithLoadError(fetchError, sortedLinks.length) ? (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-surface-elevated p-6">
      <p className="text-sm text-danger">{explainLoadError(fetchError)}</p>
      <p className="text-[13px] text-subtle">Something went wrong loading this group.</p>
      <button
        type="button"
        onClick={() => void loadLinks()}
        className="inline-flex h-8 items-center justify-center rounded-full bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg transition-[transform,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97]"
      >
        Retry
      </button>
    </div>
  ) : sortedLinks.length === 0 ? (
    <PastePrompt
      variant="empty"
      emptyMode={allLinksCount === 0 ? "library" : "group"}
      groupName={
        openedGroupId === "all" ? "All" : (openedGroup?.name ?? "this group")
      }
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
      {loadMoreError ? (
        <div
          className="mt-8 flex w-full flex-col items-center gap-3 pb-12 text-center"
          role="alert"
        >
          <p className="text-sm text-danger">{explainLoadError(loadMoreError)}</p>
          <p className="text-[13px] text-subtle">The links above are still here.</p>
          <button
            type="button"
            onClick={() => void retryLoadMore()}
            className="inline-flex h-8 items-center justify-center rounded-full bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg transition-[transform,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97]"
          >
            Retry
          </button>
        </div>
      ) : hasMoreLinks ? (
        <div
          ref={sentinelRef}
          className="mt-8 flex w-full flex-col items-center gap-2 pb-12"
          aria-busy="true"
          aria-label="Loading more links"
        >
          <div className="vault-skeleton size-8 rounded-full bg-neutral-800/50" />
          <span className="text-[12px] text-subtle">Loading more…</span>
        </div>
      ) : null}
      {!hasMoreLinks && !loadMoreError ? (
        <PastePrompt
          variant="end"
          groupId={addLinkGroupId}
          saveLink={saveLink}
          onSaved={onLinkSaved}
        />
      ) : null}
    </>
  );

  return (
    <main
      id="vault-feed"
      tabIndex={-1}
      className="relative z-30 flex min-h-0 min-w-0 flex-1 flex-col bg-background outline-none scroll-mt-4 lg:h-full"
    >
      <header className="shrink-0 -me-[var(--layout-pad)] flex flex-col gap-y-[var(--layout-gap-item)] pe-[var(--layout-pad)] pt-[max(1rem,env(safe-area-inset-top))] lg:flex-row lg:items-baseline lg:justify-between lg:gap-x-[var(--layout-gap-control)]">
        <h1 className="font-departure shrink-0 text-[15px] font-medium leading-normal tracking-wide text-foreground uppercase">
          <MorphText>
            {openedGroupId === "all"
              ? "All Links"
              : (openedGroup?.name ?? "memory404")}
          </MorphText>
        </h1>
        <span className="shrink-0 text-[13px] text-muted tabular-nums">
          <MorphText>
            {openedGroupId === "all"
              ? `${allLinksCount} link${allLinksCount === 1 ? "" : "s"}`
              : openedGroup
                ? `${openedGroup.linksCount} link${openedGroup.linksCount === 1 ? "" : "s"}`
                : ""}
          </MorphText>
        </span>
      </header>

      <div
        ref={scrollRootRef}
        className="mt-[var(--layout-gap-control)] min-h-0 min-w-0 flex-1 overflow-y-auto [scrollbar-width:thin]"
      >
        <div className="flex min-w-0 flex-col gap-[var(--layout-gap-group)] pb-8 pe-[var(--layout-pad)]">
          {missingGroupNotice ? (
            <p role="status" className="text-[13px] text-muted">
              {missingGroupNotice}
            </p>
          ) : null}
          {groupToolbar}
          {feedBody}
        </div>
      </div>
    </main>
  );
}
