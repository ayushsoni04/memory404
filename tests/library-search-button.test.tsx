// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultGroupToolbar from "@/components/vault/VaultGroupToolbar";
import type { GroupRow } from "@/components/vault/types";
import { playUiSound } from "@/lib/ui-sound";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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

function renderToolbar(onOpenSearch = vi.fn()) {
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
      loadGroups={async () => undefined}
      loadLinks={async () => undefined}
      onOpenSearch={onOpenSearch}
      onDropLink={() => {}}
    />,
  );
  return onOpenSearch;
}

describe("library Search button", () => {
  it("does nothing while another dialog is already open", () => {
    const onOpenSearch = renderToolbar();
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.textContent = "Move Reading to Trash?";
    document.body.append(dialog);

    fireEvent.click(screen.getByRole("button", { name: /Search/ }));
    expect(onOpenSearch).not.toHaveBeenCalled();
    expect(playUiSound).not.toHaveBeenCalled();

    dialog.remove();
    fireEvent.click(screen.getByRole("button", { name: /Search/ }));
    expect(onOpenSearch).toHaveBeenCalledOnce();
    expect(playUiSound).toHaveBeenCalledWith("tick");
  });
});
