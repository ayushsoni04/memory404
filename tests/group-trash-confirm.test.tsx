// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GroupTrashConfirm, {
  groupTrashDetail,
  groupTrashTarget,
} from "@/components/vault/GroupTrashConfirm";

afterEach(() => {
  cleanup();
});

describe("groupTrashTarget", () => {
  const groups = [
    { id: "general", name: "General", linksCount: 2 },
    { id: "reading", name: "Reading", linksCount: 4 },
  ];

  it("refuses the catch-all group and unknown ids", () => {
    expect(groupTrashTarget(groups, "general")).toBeNull();
    expect(groupTrashTarget(groups, "missing")).toBeNull();
  });

  it("returns a named group that can move to Trash", () => {
    expect(groupTrashTarget(groups, "reading")).toEqual(groups[1]);
  });
});

describe("groupTrashDetail", () => {
  it("names how many links move with the group", () => {
    expect(groupTrashDetail(0)).toMatch(/empty/);
    expect(groupTrashDetail(1)).toMatch(/1 link moves with it/);
    expect(groupTrashDetail(4)).toMatch(/4 links move with it/);
  });
});

describe("GroupTrashConfirm", () => {
  it("asks before moving the group and cancels on Escape", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <GroupTrashConfirm
        name="Reading"
        linksCount={4}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Move Reading to Trash?" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/4 links move with it/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms only from Move to Trash", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <GroupTrashConfirm
        name="Reading"
        linksCount={1}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Move to Trash" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
