// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultGroupToolbar from "@/components/vault/VaultGroupToolbar";
import type { GroupRow } from "@/components/vault/types";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const folders: GroupRow[] = [
  {
    id: "reading",
    name: "Reading",
    createdAt: "2026-01-01T00:00:00.000Z",
    linksCount: 1,
    previewTitles: [],
  },
];

describe("library toolbar tap targets", () => {
  it("keeps the phone controls at 44px and the desktop controls compact", () => {
    render(
      <VaultGroupToolbar
        openedGroupId="reading"
        selectGroup={() => {}}
        generalGroup={{ ...folders[0], id: "general", name: "General" }}
        filteredFolders={folders}
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
        onOpenSearch={() => {}}
        onDropLink={() => {}}
      />,
    );

    const expectPhoneTarget = (element: HTMLElement, desktop: string) => {
      expect(element.className).toContain("h-11");
      expect(element.className).toContain(desktop);
    };

    expectPhoneTarget(screen.getByRole("button", { name: "All" }), "sm:h-7");
    expectPhoneTarget(screen.getByRole("button", { name: /Search/ }), "sm:h-7");
    expectPhoneTarget(screen.getByRole("button", { name: /Sort links/ }), "sm:h-7");
    const refresh = screen.getByRole("button", { name: "Refresh" });
    expectPhoneTarget(refresh, "sm:h-7");
    expect(refresh.className).toContain("min-w-11");
    expect(refresh.className).toContain("sm:min-w-0");

    const add = screen.getByRole("button", { name: "Add group" });
    expect(add.className).toContain("size-11");
    expect(add.className).toContain("sm:size-7");

    const trash = screen.getByRole("button", { name: "Move Reading to Trash" });
    expect(trash.className).toContain("h-11");
    expect(trash.className).toContain("w-11");
    expect(trash.className).toContain("sm:size-6");
  });
});
