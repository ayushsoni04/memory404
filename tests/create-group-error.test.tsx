// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GROUP_NAME_MAX, GROUP_NAME_TAKEN } from "@/lib/group-name";
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
    expect(input.className).toContain("focus-visible:ring-2");
    expect(alert).toHaveAttribute("id", "create-group-error");
  });

  it("says a name is too long while it is being typed", () => {
    function Field() {
      const [name, setName] = useState("");
      const [error, setError] = useState<string | null>(null);
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
          addingAt={0}
          createGroupName={name}
          setCreateGroupName={setName}
          creatingGroup={false}
          createGroupError={error}
          setCreateGroupError={setError}
          createGroup={async () => undefined}
          openAddGroup={() => {}}
          cancelAddGroup={() => {}}
          groupInputRef={{ current: null }}
          groupSizerRef={{ current: null }}
          groupInputWidth={120}
          sortBy="newest"
          setSortByAndPersist={() => {}}
          loadGroups={async () => undefined}
        />
      );
    }

    render(<Field />);
    const input = screen.getByRole("textbox", { name: "Group name" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "R".repeat(GROUP_NAME_MAX + 1) } });
    expect(screen.getByRole("alert")).toHaveTextContent(/60 characters or fewer/);
    expect(input).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(input, { target: { value: "Reading" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says the name is already used while it is being typed", () => {
    function Field() {
      const [name, setName] = useState("");
      const [error, setError] = useState<string | null>(null);
      return (
        <VaultGroupToolbar
          openedGroupId="all"
          selectGroup={() => {}}
          generalGroup={null}
          groups={[
            {
              id: "reading",
              name: "Reading",
              createdAt: "2026-10-01T00:00:00.000Z",
              linksCount: 1,
              previewTitles: [],
            },
          ]}
          filteredFolders={[]}
          draggingGroupId={null}
          setDraggingGroupId={() => {}}
          persistFolderOrder={() => {}}
          canReorderPills={false}
          handleDeleteGroup={() => {}}
          addingAt={0}
          createGroupName={name}
          setCreateGroupName={setName}
          creatingGroup={false}
          createGroupError={error}
          setCreateGroupError={setError}
          createGroup={async () => undefined}
          openAddGroup={() => {}}
          cancelAddGroup={() => {}}
          groupInputRef={{ current: null }}
          groupSizerRef={{ current: null }}
          groupInputWidth={120}
          sortBy="newest"
          setSortByAndPersist={() => {}}
          loadGroups={async () => undefined}
        />
      );
    }

    render(<Field />);
    const input = screen.getByRole("textbox", { name: "Group name" });
    fireEvent.change(input, { target: { value: "read" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "reading" } });
    expect(screen.getByRole("alert")).toHaveTextContent(GROUP_NAME_TAKEN);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
