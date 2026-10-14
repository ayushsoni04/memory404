// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultFeed from "@/components/vault/VaultFeed";
import {
  MISSING_GROUP_NOTICE,
  resolveOpenedGroup,
} from "@/components/vault/opened-group";

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

afterEach(() => {
  cleanup();
});

describe("resolveOpenedGroup", () => {
  it("keeps All and a group that still exists", () => {
    expect(
      resolveOpenedGroup({
        openedGroupId: "all",
        groupIds: ["reading"],
        groupsReady: true,
        creatingGroup: false,
      }),
    ).toBe("all");
    expect(
      resolveOpenedGroup({
        openedGroupId: "reading",
        groupIds: ["reading"],
        groupsReady: true,
        creatingGroup: false,
      }),
    ).toBe("reading");
  });

  it("waits while groups are loading or a group is being created", () => {
    expect(
      resolveOpenedGroup({
        openedGroupId: "reading",
        groupIds: [],
        groupsReady: false,
        creatingGroup: false,
      }),
    ).toBe("reading");
    expect(
      resolveOpenedGroup({
        openedGroupId: "brand-new",
        groupIds: ["reading"],
        groupsReady: true,
        creatingGroup: true,
      }),
    ).toBe("brand-new");
  });

  it("sends an unknown group back to All", () => {
    expect(
      resolveOpenedGroup({
        openedGroupId: "deleted-group",
        groupIds: ["reading"],
        groupsReady: true,
        creatingGroup: false,
      }),
    ).toBe("all");
  });
});

describe("VaultFeed missing group notice", () => {
  it("explains why All is showing", () => {
    render(
      <VaultFeed
        groupToolbar={<div>Toolbar</div>}
        openedGroupId="all"
        openedGroup={null}
        allLinksCount={1}
        groupsError={null}
        missingGroupNotice={MISSING_GROUP_NOTICE}
        loadGroups={async () => undefined}
        loadingLinks={false}
        fetchError={null}
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

    expect(screen.getByRole("status")).toHaveTextContent(MISSING_GROUP_NOTICE);
    expect(screen.getByRole("heading", { name: "All Links" })).toBeInTheDocument();
  });
});
