// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultGroupToolbar from "@/components/vault/VaultGroupToolbar";
import {
  activeGroupPill,
  groupPillIds,
  nextGroupPill,
} from "@/components/vault/group-pills";
import { SHORTCUT_ROWS } from "@/components/vault/shortcut-help";
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
  {
    id: "design",
    name: "Design",
    createdAt: "2026-01-02T00:00:00.000Z",
    linksCount: 2,
    previewTitles: [],
  },
];

function renderPills(openedGroupId: string | null = "all") {
  const selectGroup = vi.fn();
  render(
    <VaultGroupToolbar
      openedGroupId={openedGroupId}
      selectGroup={selectGroup}
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
      onDropLink={() => {}}
    />,
  );
  return { selectGroup };
}

describe("nextGroupPill", () => {
  const ids = groupPillIds(["reading", "design"]);

  it("walks the row and stops at the ends", () => {
    expect(ids).toEqual(["all", "reading", "design"]);
    expect(activeGroupPill("missing", ids)).toBe("all");
    expect(activeGroupPill("design", ids)).toBe("design");
    expect(nextGroupPill("all", ids, "ArrowRight")).toBe("reading");
    expect(nextGroupPill("reading", ids, "ArrowLeft")).toBe("all");
    expect(nextGroupPill("reading", ids, "ArrowDown")).toBe("design");
    expect(nextGroupPill("design", ids, "ArrowUp")).toBe("reading");
    expect(nextGroupPill("all", ids, "ArrowLeft")).toBeNull();
    expect(nextGroupPill("design", ids, "ArrowRight")).toBeNull();
    expect(nextGroupPill("reading", ids, "Home")).toBe("all");
    expect(nextGroupPill("reading", ids, "End")).toBe("design");
    expect(nextGroupPill("all", ids, "Home")).toBeNull();
    expect(nextGroupPill("all", ids, "Enter")).toBeNull();
  });
});

describe("group pill toolbar", () => {
  it("moves focus with the arrow keys and keeps one tab stop", () => {
    const { selectGroup } = renderPills("all");
    expect(screen.getByRole("toolbar", { name: "Groups" })).toBeInTheDocument();

    const all = screen.getByRole("button", { name: "All" });
    const reading = screen.getByRole("button", { name: "Reading" });
    const design = screen.getByRole("button", { name: "Design" });
    expect(all).toHaveAttribute("tabindex", "0");
    expect(reading).toHaveAttribute("tabindex", "-1");
    expect(design).toHaveAttribute("tabindex", "-1");
    const trash = screen.getByRole("button", { name: "Move Reading to Trash" });
    expect(trash).toHaveAttribute("tabindex", "-1");
    expect(trash.className).toContain("size-6");
    expect(all.closest("[data-drop-target]")?.className).toContain("focus-within:ring-2");

    fireEvent.keyDown(all, { key: "ArrowRight" });
    expect(selectGroup).toHaveBeenCalledWith("reading");
    expect(reading).toHaveFocus();

    fireEvent.keyDown(design, { key: "ArrowRight" });
    expect(selectGroup).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(reading, { key: "End" });
    expect(selectGroup).toHaveBeenCalledWith("design");
    expect(design).toHaveFocus();
  });

  it("puts only the open group's trash control in the tab order", () => {
    renderPills("reading");
    expect(screen.getByRole("button", { name: "Move Reading to Trash" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("button", { name: "Move Design to Trash" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.getByRole("button", { name: "Reading" })).toHaveAttribute("tabindex", "0");
  });

  it("lists group arrows in the shortcut help", () => {
    expect(SHORTCUT_ROWS.find((row) => row.id === "groups")).toMatchObject({
      label: "Move through groups",
      keys: ["←", "→"],
    });
  });
});
