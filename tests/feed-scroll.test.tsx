// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultFeed from "@/components/vault/VaultFeed";
import { scrollFeedToTop } from "@/components/vault/feed-scroll";
import type { GroupRow } from "@/components/vault/types";

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/AddLinkCard", () => ({
  default: () => <div>Add link</div>,
}));

vi.mock("@/components/LinkCard", () => ({
  default: () => <article>Card</article>,
}));

vi.mock("@/components/vault/PastePrompt", () => ({
  default: () => <div>Paste</div>,
}));

const originalScrollTo = Element.prototype.scrollTo;

afterEach(() => {
  Element.prototype.scrollTo = originalScrollTo;
  cleanup();
});

const reading: GroupRow = {
  id: "reading",
  name: "Reading",
  createdAt: "2026-10-01T12:00:00.000Z",
  linksCount: 2,
  previewTitles: [],
};

function renderFeed(openedGroupId: string, openedGroup: GroupRow | null) {
  return render(
    <VaultFeed
      groupToolbar={<div>Toolbar</div>}
      openedGroupId={openedGroupId}
      openedGroup={openedGroup}
      allLinksCount={4}
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
      sortedLinks={[]}
      openLinkDetail={() => {}}
      feedImageSizes="50vw"
      hasMoreLinks={false}
      sentinelRef={{ current: null }}
      scrollRootRef={{ current: null }}
    />,
  );
}

describe("scrollFeedToTop", () => {
  it("asks the scroller to return to the first row", () => {
    const scrollTo = vi.fn();
    const root = document.createElement("div");
    root.scrollTo = scrollTo;
    scrollFeedToTop(root);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    scrollFeedToTop(null);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});

describe("VaultFeed group change", () => {
  it("returns to the top when another group opens", () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;

    const view = renderFeed("all", null);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });

    scrollTo.mockClear();
    view.rerender(
      <VaultFeed
        groupToolbar={<div>Toolbar</div>}
        openedGroupId="reading"
        openedGroup={reading}
        allLinksCount={4}
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
        sortedLinks={[]}
        openLinkDetail={() => {}}
        feedImageSizes="50vw"
        hasMoreLinks={false}
        sentinelRef={{ current: null }}
        scrollRootRef={{ current: null }}
      />,
    );

    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });
});
