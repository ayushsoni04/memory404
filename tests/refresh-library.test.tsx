// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("library refresh", () => {
  it("runs one refresh at a time and stops spinning when it finishes", async () => {
    let release: () => void = () => {};
    const loadLinks = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const loadGroups = vi.fn(async () => undefined);

    render(
      <VaultGroupToolbar
        openedGroupId="all"
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
        loadGroups={loadGroups}
        loadLinks={loadLinks}
        onDropLink={() => {}}
      />,
    );

    const refresh = screen.getByRole("button", { name: "Refresh" });
    expect(refresh.querySelector("svg")?.getAttribute("class")).toContain(
      "motion-reduce:animate-none",
    );

    fireEvent.click(refresh);
    fireEvent.click(refresh);

    expect(loadLinks).toHaveBeenCalledOnce();
    expect(loadGroups).toHaveBeenCalledOnce();
    expect(refresh).toBeDisabled();
    expect(refresh).toHaveAttribute("aria-busy", "true");
    expect(refresh.querySelector("svg")?.getAttribute("class")).toContain("animate-spin");

    release();
    await waitFor(() => {
      expect(refresh).toBeEnabled();
    });
    expect(refresh).not.toHaveAttribute("aria-busy");
  });
});
