"use client";

import { useEffect, useRef, useMemo } from "react";
import AddLinkCard from "@/components/AddLinkCard";
import LinkCard from "@/components/LinkCard";
import { GlobeSwap } from "@/components/workspace/text-swap/GlobeSwap";
import LoadRecovery from "@/components/LoadRecovery";
import { explainLoadError } from "@/lib/load-error";
import { isSessionExpiredMessage } from "@/lib/session-recovery";
import type { LinkApiRow } from "@/lib/links";
import { FeedEndReadouts } from "./FeedEndReadouts";
import FeedGrid from "./FeedGrid";
import { scrollFeedToTop } from "./feed-scroll";
import {
  feedMoreView,
  loadMoreFocusAfter,
  replaceFeedWithLoadError,
  showRefreshFailure,
} from "./feed-load";
import PastePrompt from "./PastePrompt";
import { LinkOdometer } from "./LinkOdometer";
import { OutroSparkles } from "./OutroSparkles";
import { BottomDock } from "./BottomDock";
import { countReadout, SignalMetaRow } from "./SignalPoster";
import type { GridSize, GroupRow } from "./types";
import type { LibraryLayout } from "@/lib/layout-pref";

type SaveLinkResult =
  | { ok: true; link: LinkApiRow }
  | { ok: false; error: string };

type VaultFeedProps = {
  groupToolbar: React.ReactNode;
  /** Opens the ⌘K palette from the bottom dock. */
  onOpenSearch?: () => void;
  isOwner?: boolean;
  layout?: LibraryLayout;
  setGridSize?: (next: GridSize) => void;
  /** Groups in chip-row order; the heading spins through these. */
  groupOrder?: { id: string; name: string }[];
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
  loadingMore?: boolean;
  onLoadMore?: () => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  scrollRootRef: React.RefObject<HTMLDivElement | null>;
};

/** Same feel as the Globe lab default. */
const GLOBE_HEADING_MS = 560;

/** The heading reads as a statement: "design system" is drawn "Design system." */
function headingStatement(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const sentence = `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
  return /[.!?…]$/.test(sentence) ? sentence : `${sentence}.`;
}

export default function VaultFeed({
  groupToolbar,
  onOpenSearch,
  isOwner = false,
  layout = "sidebar",
  setGridSize,
  groupOrder = [],
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
  loadingMore = false,
  onLoadMore,
  sentinelRef,
  scrollRootRef,
}: VaultFeedProps) {
  // "All Links" first, then the groups in chip-row order. Keyed on the names so
  // the heading only rebuilds when the list really changes.
  const groupNames = groupOrder.map((g) => g.name).join("\u0000");
  const globeItems = useMemo(
    () => ["All Links", ...(groupNames ? groupNames.split("\u0000") : [])],
    [groupNames],
  );
  const globe = useMemo(() => {
    if (openedGroupId === "all") return { items: globeItems, index: 0 };
    const i = groupOrder.findIndex((g) => g.id === openedGroupId);
    if (i >= 0) return { items: globeItems, index: i + 1 };
    // A group outside the chip row (or none): show its name on its own.
    return { items: [openedGroup?.name ?? "memory404"], index: 0 };
  }, [globeItems, groupOrder, openedGroupId, openedGroup?.name]);
  const addLinkGroupId =
    openedGroupId === "all" ? (generalGroup?.id ?? null) : openedGroupId;

  const loadMoreWasLoading = useRef(false);
  const loadMoreButtonRef = useRef<HTMLButtonElement>(null);
  const loadMoreRecoveryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollFeedToTop(scrollRootRef.current);
  }, [openedGroupId, scrollRootRef]);

  useEffect(() => {
    const next = loadMoreFocusAfter(
      loadMoreWasLoading.current,
      loadingMore,
      loadMoreError,
      hasMoreLinks,
    );
    loadMoreWasLoading.current = loadingMore;
    if (!next) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== document.body &&
      active !== document.documentElement
    ) {
      return;
    }
    if (next === "retry") {
      const recovery = loadMoreRecoveryRef.current?.querySelector("button, a");
      if (recovery instanceof HTMLElement) recovery.focus();
      return;
    }
    loadMoreButtonRef.current?.focus();
  }, [hasMoreLinks, loadMoreError, loadingMore]);

  const groupsLoadMessage = explainLoadError(groupsError);
  const groupsSessionEnded = isSessionExpiredMessage(groupsLoadMessage);
  const groupsFailedToLoad = Boolean(
    groupsError &&
      (groupsLoadMessage !== groupsError || /load groups/i.test(groupsError)),
  );
  const feedBody = groupsFailedToLoad && !loadingLinks && sortedLinks.length === 0 ? (
    <div
      className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface-elevated p-6"
      role="alert"
    >
      <p className="text-sm text-foreground">
        {groupsSessionEnded ? groupsLoadMessage : "Groups could not be loaded."}
      </p>
      <p className="text-[13px] text-subtle">
        {groupsSessionEnded
          ? "Sign in, then open your library again."
          : "Check your connection, then try again."}
      </p>
      <LoadRecovery
        message={groupsLoadMessage}
        returnPath="/"
        onRetry={() => void loadGroups()}
      />
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
    <div
      className="flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-surface-elevated p-6"
      role="alert"
    >
      <p className="text-sm text-danger">{explainLoadError(fetchError)}</p>
      <p className="text-[13px] text-subtle">
        {isSessionExpiredMessage(explainLoadError(fetchError))
          ? "Sign in, then open your library again."
          : "Something went wrong loading this group."}
      </p>
      <LoadRecovery
        message={explainLoadError(fetchError)}
        returnPath="/"
        onRetry={() => void loadLinks()}
      />
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
          ref={loadMoreRecoveryRef}
          className="mt-8 flex w-full flex-col items-center gap-3 pb-12 text-center"
          role="alert"
        >
          <p className="text-sm text-danger">{explainLoadError(loadMoreError)}</p>
          <p className="text-[13px] text-subtle">The links above are still here.</p>
          <LoadRecovery
            message={explainLoadError(loadMoreError)}
            returnPath="/"
            onRetry={() => void retryLoadMore()}
          />
        </div>
      ) : null}
      {feedMoreView(hasMoreLinks, loadingMore, loadMoreError) === "hidden" ? null : (
        <div
          ref={sentinelRef}
          className="mt-8 flex w-full flex-col items-center gap-2 pb-12"
          aria-busy={loadingMore || undefined}
          aria-label={loadingMore ? "Loading more links" : undefined}
        >
          {loadingMore ? (
            <>
              <div className="vault-skeleton size-8 rounded-full bg-neutral-800/50" />
              <span className="text-[12px] text-subtle">Loading more…</span>
            </>
          ) : (
            <button
              ref={loadMoreButtonRef}
              type="button"
              onClick={() => onLoadMore?.()}
              className="inline-flex h-11 items-center justify-center rounded-full bg-pill px-4 text-[13px] font-medium text-foreground transition-[transform,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-pill-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-8 sm:px-3"
            >
              Load more
            </button>
          )}
        </div>
      )}
      {!hasMoreLinks && !loadMoreError ? (
        // `contents` keeps the default layout; the Signal style hides this
        // wrapper so the feed ends on the closing line alone.
        <div className="feed-end-prompt contents">
          <PastePrompt
            variant="end"
            groupId={addLinkGroupId}
            saveLink={saveLink}
            onSaved={onLinkSaved}
          />
        </div>
      ) : null}
      {!hasMoreLinks && !loadMoreError ? (
        <div className="relative">
          <p className="sig-outro art-only" aria-hidden>
            <span className="outro-words">
              A private archive for the links
              <br className="max-sm:hidden" /> you meant to come back to.
              <OutroSparkles />
            </span>
          </p>
          <FeedEndReadouts />
        </div>
      ) : null}
    </>
  );

  return (
    <main
      id="vault-feed"
      tabIndex={-1}
      className="art-clear relative z-30 flex min-h-0 min-w-0 flex-1 flex-col bg-background outline-none scroll-mt-4 lg:h-full"
    >
      {/* Signal art style only: a live readout strip, spread like a spec sheet. */}
      <p className="sig-feed-meta art-only" aria-hidden>
        <SignalMetaRow
          words={[
            "MEMORY404",
            "[FEED]",
            "/",
            countReadout(allLinksCount),
            "LINKS",
            "HELD",
            "/",
            "GRID",
            gridSize === "compact" ? "S" : gridSize === "default" ? "M" : "L",
            "//",
            "SIGNAL",
            "LOCKED",
          ]}
        />
      </p>
      {onOpenSearch ? <BottomDock
          onOpenSearch={onOpenSearch}
          isOwner={isOwner}
          layout={layout}
          gridSize={gridSize}
          setGridSize={setGridSize}
        /> : null}
      <div
        ref={scrollRootRef}
        // One scroller, like designeer: the centred hero scrolls away and the
        // chip row sticks at the top, with the cards fading out beneath it.
        className="feed-scroller -ms-2 min-h-0 min-w-0 flex-1 overflow-y-auto ps-2 [scrollbar-width:thin]"
      >
        <header className="vault-header feed-hero">
          <h1 className="vault-title feed-hero-title min-w-0 max-w-full break-words">
            <GlobeSwap
              items={globe.items}
              index={globe.index}
              durationMs={GLOBE_HEADING_MS}
              display={headingStatement}
              peekOpacity={0.39}
              peekReach={0.75}
              className="max-w-full"
            />
          </h1>
          <div className="feed-hero-count">
            <LinkOdometer
              count={
                openedGroupId === "all"
                  ? allLinksCount
                  : (openedGroup?.linksCount ?? 0)
              }
            />
          </div>
        </header>

        <div className="feed-sticky-bar sticky top-0 z-20 -ms-2 min-w-0 bg-background/80 ps-2 pe-[var(--layout-pad)] backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:content-['']">
          {groupToolbar}
        </div>

        <div className="flex min-w-0 flex-col gap-[var(--layout-gap-group)] pt-2 pb-8 pe-[var(--layout-pad)]">
          {missingGroupNotice ? (
            <p role="status" className="text-[13px] text-muted">
              {missingGroupNotice}
            </p>
          ) : null}
          {showRefreshFailure(fetchError, sortedLinks.length, loadMoreError) ? (
            <div
              className="flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-surface-elevated p-6"
              role="alert"
            >
              <p className="text-sm text-danger">{explainLoadError(fetchError)}</p>
              <p className="text-[13px] text-subtle">
                The links on screen are still here.
              </p>
              <LoadRecovery
                message={explainLoadError(fetchError)}
                returnPath="/"
                onRetry={() => void loadLinks()}
              />
            </div>
          ) : null}
          {feedBody}
        </div>
      </div>
      
    </main>
  );
}
