// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatsTab } from "@/app/settings/_components/StatsTab";
import VaultFeed from "@/components/vault/VaultFeed";
import VaultGroupToolbar from "@/components/vault/VaultGroupToolbar";
import type { GroupRow } from "@/components/vault/types";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

vi.mock("@/components/MorphText", () => ({
  default: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

vi.mock("@/components/AddLinkCard", () => ({
  default: () => null,
}));

vi.mock("@/components/LinkCard", () => ({
  default: () => null,
}));

vi.mock("@/components/vault/PastePrompt", () => ({
  default: () => null,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const longName = "Research-notes-for-the-quarterly-review-archive-2026";

const folder: GroupRow = {
  id: "research",
  name: longName,
  createdAt: "2026-10-01T00:00:00.000Z",
  linksCount: 3,
  previewTitles: [],
};

describe("long group names", () => {
  it("keeps a pill name on one line and still says the full name", () => {
    render(
      <VaultGroupToolbar
        openedGroupId="research"
        selectGroup={() => {}}
        generalGroup={{ ...folder, id: "general", name: "General" }}
        filteredFolders={[folder]}
        draggingGroupId={null}
        setDraggingGroupId={() => {}}
        persistFolderOrder={() => {}}
        canReorderPills={false}
        handleDeleteGroup={() => {}}
        addingAt={null}
        createGroupName=""
        setCreateGroupName={() => {}}
        creatingGroup={false}
        createGroupError={null}
        setCreateGroupError={() => {}}
        createGroup={async () => undefined}
        openAddGroup={() => {}}
        cancelAddGroup={() => {}}
        groupInputRef={{ current: null }}
        groupSizerRef={{ current: null }}
        groupInputWidth={96}
        sortBy="newest"
        setSortByAndPersist={() => {}}
        loadGroups={async () => undefined}
      />,
    );

    const pill = screen.getByRole("button", { name: longName });
    expect(pill.className).toContain("truncate");
    expect(pill.className).toContain("max-w-48");
    expect(pill).toHaveAttribute("title", longName);
  });

  it("keeps the new-group field from growing past a pill", () => {
    render(
      <VaultGroupToolbar
        openedGroupId="all"
        selectGroup={() => {}}
        generalGroup={null}
        filteredFolders={[]}
        draggingGroupId={null}
        setDraggingGroupId={() => {}}
        persistFolderOrder={() => {}}
        canReorderPills={false}
        handleDeleteGroup={() => {}}
        addingAt={0}
        createGroupName={longName}
        setCreateGroupName={() => {}}
        creatingGroup={false}
        createGroupError={null}
        setCreateGroupError={() => {}}
        createGroup={async () => undefined}
        openAddGroup={() => {}}
        cancelAddGroup={() => {}}
        groupInputRef={{ current: null }}
        groupSizerRef={{ current: null }}
        groupInputWidth={480}
        sortBy="newest"
        setSortByAndPersist={() => {}}
        loadGroups={async () => undefined}
      />,
    );

    const field = screen.getByRole("textbox", { name: "Group name" });
    expect(field.className).toContain("max-w-48");
    expect(field.className).toContain("min-w-0");
    expect(field.style.width).toBe("192px");
    expect(field.parentElement?.className).toContain("max-w-48");
    expect(field.parentElement?.className).toContain("min-w-0");
    expect(field.parentElement?.className).not.toContain("shrink-0");
  });

  it("lets the library heading wrap instead of pushing the count off", () => {
    render(
      <VaultFeed
        groupToolbar={null}
        openedGroupId="research"
        openedGroup={folder}
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

    const heading = screen.getByRole("heading", { name: longName });
    expect(heading.className).toContain("break-words");
    expect(heading.className).toContain("min-w-0");
    expect(heading.className).not.toContain("shrink-0");
    expect(screen.getByText("3 links")).toBeInTheDocument();
  });

  it("keeps the link count beside a long group on Stats", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          totalLinks: 12,
          totalGroups: 1,
          linksByGroup: [{ id: "research", name: longName, count: 12 }],
          linkFrequency: [],
        }),
      }),
    );

    render(<StatsTab bannerStyle="midnight" />);

    const name = await screen.findByText(longName);
    expect(name.className).toContain("truncate");
    expect(name).toHaveAttribute("title", longName);
    expect(screen.getByText("12 links").className).toContain("shrink-0");
  });
});
