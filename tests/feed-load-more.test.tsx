// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ComponentProps, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultFeed from "@/components/vault/VaultFeed";
import {
  feedMoreView,
  isLaterLinksPage,
  loadMoreFocusAfter,
  replaceFeedWithLoadError,
  showRefreshFailure,
} from "@/components/vault/feed-load";
import type { LinkApiRow } from "@/lib/links";

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/AddLinkCard", () => ({
  default: () => <div>Add link</div>,
}));

vi.mock("@/components/LinkCard", () => ({
  default: ({ link }: { link: LinkApiRow }) => (
    <article>{link.displayTitle}</article>
  ),
}));

vi.mock("@/components/vault/PastePrompt", () => ({
  default: ({ variant }: { variant: string }) => <div>Paste {variant}</div>,
}));

afterEach(() => {
  cleanup();
});

const link: LinkApiRow = {
  id: "link-1",
  url: "https://example.com/article",
  title: "A saved article",
  customTitle: null,
  displayTitle: "A saved article",
  description: null,
  imageUrl: "",
  faviconUrl: "",
  tags: [],
  notes: null,
  groupId: "general",
  metadataStatus: "ready",
  createdAt: "2026-10-01T00:00:00.000Z",
  deletedAt: null,
};

function renderFeed(
  overrides: Partial<ComponentProps<typeof VaultFeed>> = {},
) {
  const retryLoadMore = vi.fn(async () => undefined);
  const loadLinks = vi.fn(async () => undefined);
  const props: ComponentProps<typeof VaultFeed> = {
    groupToolbar: <div>Toolbar</div>,
    openedGroupId: "all",
    openedGroup: null,
    allLinksCount: 1,
    groupsError: null,
    missingGroupNotice: null,
    loadGroups: async () => undefined,
    loadingLinks: false,
    fetchError: null,
    loadMoreError: null,
    retryLoadMore,
    loadLinks,
    gridSize: "default",
    generalGroup: null,
    saveLink: async () => ({ ok: false, error: "unused" }),
    onLinkSaved: () => {},
    enteringLinkId: null,
    sortedLinks: [link],
    openLinkDetail: () => {},
    feedImageSizes: "50vw",
    hasMoreLinks: true,
    sentinelRef: { current: null },
    scrollRootRef: { current: null },
    ...overrides,
  };
  const view = render(<VaultFeed {...props} />);
  return {
    retryLoadMore,
    loadLinks,
    rerender: (next: Partial<ComponentProps<typeof VaultFeed>> = {}) =>
      view.rerender(<VaultFeed {...props} {...next} />),
  };
}

describe("feed load helpers", () => {
  it("tells a later page apart from the first page", () => {
    expect(isLaterLinksPage("/api/links?limit=24")).toBe(false);
    expect(isLaterLinksPage("/api/links?limit=24&cursor=abc")).toBe(true);
    expect(isLaterLinksPage("https://memory404.app/api/links?cursor=abc")).toBe(
      true,
    );
  });

  it("replaces the feed only when nothing has loaded", () => {
    expect(replaceFeedWithLoadError("Failed to load links", 0)).toBe(true);
    expect(replaceFeedWithLoadError("Failed to load links", 3)).toBe(false);
    expect(replaceFeedWithLoadError(null, 0)).toBe(false);
  });

  it("shows a button until the next page is actually loading", () => {
    expect(feedMoreView(true, false, null)).toBe("button");
    expect(feedMoreView(true, true, null)).toBe("loading");
    expect(feedMoreView(true, true, "Failed to load links")).toBe("hidden");
    expect(feedMoreView(false, false, null)).toBe("hidden");
  });

  it("returns focus to Load more, or to Retry when the next page fails", () => {
    expect(loadMoreFocusAfter(false, false, null, true)).toBeNull();
    expect(loadMoreFocusAfter(true, true, null, true)).toBeNull();
    expect(loadMoreFocusAfter(true, false, null, true)).toBe("button");
    expect(loadMoreFocusAfter(true, false, "Failed to load links", true)).toBe("retry");
    expect(loadMoreFocusAfter(true, false, null, false)).toBeNull();
  });

  it("shows a refresh failure only when links are already on screen", () => {
    expect(showRefreshFailure("Failed to load links", 3, null)).toBe(true);
    expect(showRefreshFailure("Failed to load links", 0, null)).toBe(false);
    expect(showRefreshFailure("Failed to load links", 3, "next page")).toBe(false);
    expect(showRefreshFailure(null, 3, null)).toBe(false);
  });
});

describe("VaultFeed load more failure", () => {
  it("keeps the links and offers Retry when the next page fails", () => {
    const { retryLoadMore } = renderFeed({
      loadMoreError: "Failed to load links",
      fetchError: "Failed to load links",
    });

    expect(screen.getByText("A saved article")).toBeInTheDocument();
    expect(screen.getByText("The links above are still here.")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong loading this group.")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Loading more links")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retryLoadMore).toHaveBeenCalledOnce();
  });

  it("replaces an empty feed when the first page fails", () => {
    renderFeed({
      fetchError: "Failed to load links",
      sortedLinks: [],
      hasMoreLinks: false,
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong loading this group.",
    );
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry.className).toContain("min-h-11");
    expect(retry.className).toContain("sm:min-h-8");
    expect(retry.className).toContain("focus-visible:ring-2");
    expect(screen.queryByText("A saved article")).not.toBeInTheDocument();
  });

  it("announces when groups cannot be loaded", () => {
    renderFeed({
      groupsError: "Failed to load groups",
      sortedLinks: [],
      hasMoreLinks: false,
      allLinksCount: 0,
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Groups could not be loaded.");
    expect(alert).toHaveTextContent("Check your connection, then try again.");
    expect(screen.getByRole("button", { name: "Retry" }).className).toContain("min-h-11");
    expect(screen.queryByText("Paste empty")).not.toBeInTheDocument();
  });

  it("loads the next page from a button, and says so only while that page is loading", () => {
    const onLoadMore = vi.fn();
    const { unmount } = render(
      <VaultFeed
        groupToolbar={<div>Toolbar</div>}
        openedGroupId="all"
        openedGroup={null}
        allLinksCount={1}
        groupsError={null}
        missingGroupNotice={null}
        loadGroups={async () => undefined}
        loadingLinks={false}
        fetchError={null}
        loadMoreError={null}
        retryLoadMore={async () => undefined}
        loadLinks={async () => undefined}
        gridSize="default"
        generalGroup={null}
        saveLink={async () => ({ ok: false, error: "unused" })}
        onLinkSaved={() => {}}
        enteringLinkId={null}
        sortedLinks={[link]}
        openLinkDetail={() => {}}
        feedImageSizes="50vw"
        hasMoreLinks
        onLoadMore={onLoadMore}
        sentinelRef={{ current: null }}
        scrollRootRef={{ current: null }}
      />,
    );

    expect(screen.queryByText("Loading more…")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Loading more links")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Load more" });
    expect(button.className).toContain("h-11");
    expect(button.className).toContain("sm:h-8");
    fireEvent.click(button);
    expect(onLoadMore).toHaveBeenCalledOnce();
    unmount();

    renderFeed({ loadingMore: true });
    expect(screen.getByLabelText("Loading more links")).toBeInTheDocument();
    expect(screen.getByText("Loading more…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("keeps the links and says when a refresh fails", () => {
    const { loadLinks } = renderFeed({
      fetchError: "Failed to fetch",
      hasMoreLinks: false,
    });

    expect(screen.getByText("A saved article")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't reach memory404. Check your connection and try again.",
    );
    expect(screen.getByText("The links on screen are still here.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(loadLinks).toHaveBeenCalledOnce();
  });

  it("returns to Load more when the next page finishes", () => {
    const { rerender } = renderFeed({ loadingMore: true });
    expect(screen.getByLabelText("Loading more links")).toBeInTheDocument();

    rerender({ loadingMore: false });
    expect(screen.getByRole("button", { name: "Load more" })).toHaveFocus();
  });

  it("returns to Retry when the next page fails", () => {
    const { rerender } = renderFeed({ loadingMore: true });
    rerender({ loadingMore: false, loadMoreError: "Failed to load links" });
    expect(screen.getByRole("button", { name: "Retry" })).toHaveFocus();
    expect(screen.getByText("The links above are still here.")).toBeInTheDocument();
  });

  it("leaves focus alone when it has already moved", () => {
    function Harness({ loadingMore }: { loadingMore: boolean }) {
      return (
        <>
          <input aria-label="Note" />
          <VaultFeed
            groupToolbar={<div>Toolbar</div>}
            openedGroupId="all"
            openedGroup={null}
            allLinksCount={1}
            groupsError={null}
            missingGroupNotice={null}
            loadGroups={async () => undefined}
            loadingLinks={false}
            fetchError={null}
            loadMoreError={null}
            retryLoadMore={async () => undefined}
            loadLinks={async () => undefined}
            gridSize="default"
            generalGroup={null}
            saveLink={async () => ({ ok: false, error: "unused" })}
            onLinkSaved={() => {}}
            enteringLinkId={null}
            sortedLinks={[link]}
            openLinkDetail={() => {}}
            feedImageSizes="50vw"
            hasMoreLinks
            loadingMore={loadingMore}
            sentinelRef={{ current: null }}
            scrollRootRef={{ current: null }}
          />
        </>
      );
    }

    const view = render(<Harness loadingMore />);
    const note = screen.getByRole("textbox", { name: "Note" });
    note.focus();
    view.rerender(<Harness loadingMore={false} />);
    expect(note).toHaveFocus();
    expect(screen.getByRole("button", { name: "Load more" })).not.toHaveFocus();
  });
});
