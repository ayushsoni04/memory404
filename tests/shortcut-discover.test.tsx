// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultFeed from "@/components/vault/VaultFeed";

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/AddLinkCard", () => ({
  default: () => <div>Add link</div>,
}));

vi.mock("@/components/LinkCard", () => ({
  default: () => <article>Link</article>,
}));

vi.mock("@/components/vault/PastePrompt", () => ({
  default: () => <div>Paste</div>,
}));

afterEach(() => {
  cleanup();
});

describe("library header counter", () => {
  it("shows the link count as a rolling counter instead of Search and Signal", () => {
    render(
      <VaultFeed
        groupToolbar={<div>Toolbar</div>}
        openedGroupId="all"
        openedGroup={null}
        allLinksCount={3}
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

    const header = screen.getByRole("heading", { name: "All Links" }).closest("header")!;
    expect(header).toHaveTextContent("3 links");
    expect(screen.queryByRole("button", { name: /Search/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /Signal/ })).not.toBeInTheDocument();
  });

  it("counts only the open group's links", () => {
    render(
      <VaultFeed
        groupToolbar={<div>Toolbar</div>}
        openedGroupId="research"
        openedGroup={{ id: "research", name: "Research", createdAt: "2026-01-01T00:00:00.000Z", linksCount: 12, previewTitles: [] }}
        allLinksCount={3}
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

    expect(screen.getByText("12 links")).toBeInTheDocument();
  });
});
