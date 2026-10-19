// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultGroupToolbar from "@/components/vault/VaultGroupToolbar";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

function renderCreator(createGroup: () => Promise<void>) {
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
      createGroupError={null}
      setCreateGroupError={() => {}}
      createGroup={createGroup}
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
}

function submitGroupName() {
  const form = screen.getByRole("textbox", { name: "Group name" }).closest("form");
  if (!form) throw new Error("Group name field is not in a form");
  fireEvent.submit(form);
}

describe("creating a group once", () => {
  it("ignores a second submit until the first request finishes", async () => {
    let release: () => void = () => {};
    const createGroup = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    renderCreator(createGroup);

    submitGroupName();
    submitGroupName();

    expect(createGroup).toHaveBeenCalledOnce();
    release();
    await waitFor(() => expect(createGroup).toHaveBeenCalledOnce());
  });

  it("lets you create a group again after the first attempt finishes", async () => {
    const createGroup = vi.fn(async () => undefined);
    renderCreator(createGroup);

    submitGroupName();
    await waitFor(() => expect(createGroup).toHaveBeenCalledOnce());

    submitGroupName();
    await waitFor(() => expect(createGroup).toHaveBeenCalledTimes(2));
  });
});
