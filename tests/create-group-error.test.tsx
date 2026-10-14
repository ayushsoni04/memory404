// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultGroupToolbar from "@/components/vault/VaultGroupToolbar";
import { createGroupErrorMessage } from "@/components/vault/create-group";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("createGroupErrorMessage", () => {
  it("uses the server message, including a duplicate name", () => {
    expect(
      createGroupErrorMessage({ error: "A group with this name already exists." }),
    ).toBe("A group with this name already exists.");
    expect(createGroupErrorMessage(null, true)).toMatch(/Check your connection/);
    expect(createGroupErrorMessage({})).toBe("Failed to create group");
  });
});

describe("VaultGroupToolbar create error", () => {
  it("shows the error next to the group name field", () => {
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
        createGroupName="Reading"
        setCreateGroupName={() => {}}
        creatingGroup={false}
        createGroupError="A group with this name already exists."
        setCreateGroupError={() => {}}
        createGroup={async () => undefined}
        openAddGroup={() => {}}
        cancelAddGroup={() => {}}
        groupInputRef={{ current: null }}
        groupSizerRef={{ current: null }}
        groupInputWidth={120}
        sortBy="newest"
        setSortByAndPersist={() => {}}
        loadGroups={async () => undefined}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("A group with this name already exists.");
    const input = screen.getByRole("textbox", { name: "Group name" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "create-group-error");
    expect(alert).toHaveAttribute("id", "create-group-error");
  });
});
