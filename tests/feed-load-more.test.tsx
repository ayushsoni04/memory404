// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ComponentProps, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultFeed from "@/components/vault/VaultFeed";
import {
  isLaterLinksPage,
  replaceFeedWithLoadError,
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
  render(
    <VaultFeed
      groupToolbar={<div>Toolbar</div>}
      openedGroupId="all"
      openedGroup={null}
      allLinksCount={1}
      groupsError={null}
      loadGroups={async () => undefined}
      loadingLinks={false}
      fetchError={null}
      loadMoreError={null}
      retryLoadMore={retryLoadMore}
      loadLinks={loadLinks}
      gridSize="default"
      generalGroup={null}
      saveLink={async () => ({ ok: false, error: "unused" })}
      onLinkSaved={() => {}}
      enteringLinkId={null}
      sortedLinks={[link]}
      openLinkDetail={() => {}}
      feedImageSizes="50vw"
      hasMoreLinks
      sentinelRef={{ current: null }}
      scrollRootRef={{ current: null }}
      {...overrides}
    />,
  );
  return { retryLoadMore, loadLinks };
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

    expect(screen.getByText("Something went wrong loading this group.")).toBeInTheDocument();
    expect(screen.queryByText("A saved article")).not.toBeInTheDocument();
  });
});
