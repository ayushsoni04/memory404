// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultGroupToolbar from "@/components/vault/VaultGroupToolbar";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

function AddingGroup() {
  const [addingAt, setAddingAt] = useState<number | null>(0);
  return (
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
      addingAt={addingAt}
      createGroupName="Reading"
      setCreateGroupName={() => {}}
      creatingGroup={false}
      createGroupError={null}
      setCreateGroupError={() => {}}
      createGroup={async () => undefined}
      openAddGroup={() => setAddingAt(0)}
      cancelAddGroup={() => setAddingAt(null)}
      groupInputRef={{ current: null }}
      groupSizerRef={{ current: null }}
      groupInputWidth={120}
      sortBy="newest"
      setSortByAndPersist={() => {}}
      loadGroups={async () => undefined}
    />
  );
}

describe("cancel a new group", () => {
  it("returns focus to Add group when Escape closes the field", () => {
    render(<AddingGroup />);
    const name = screen.getByRole("textbox", { name: "Group name" });
    name.focus();
    fireEvent.keyDown(name, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "Group name" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add group" })).toHaveFocus();
  });
});
