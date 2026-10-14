// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import GroupTrashConfirm, {
  groupTrashDetail,
  groupTrashFailureMessage,
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

describe("groupTrashFailureMessage", () => {
  it("uses the server message, and a connection message when the request never returns", () => {
    expect(groupTrashFailureMessage({ error: "Group is already in Trash" })).toBe(
      "Group is already in Trash",
    );
    expect(groupTrashFailureMessage({}, true)).toMatch(/Check your connection/);
    expect(groupTrashFailureMessage(null)).toMatch(/Couldn't move that group/);
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

  it("wraps Tab inside the dialog and restores the trigger", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Trash Reading
          </button>
          {open ? (
            <GroupTrashConfirm
              name="Reading"
              linksCount={1}
              onConfirm={() => {}}
              onCancel={() => setOpen(false)}
            />
          ) : null}
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Trash Reading" });
    await user.click(trigger);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Move to Trash" })).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

  it("keeps the group in place and shows the error when the move fails", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <GroupTrashConfirm
        name="Reading"
        linksCount={4}
        pending={false}
        error="Couldn't move that group to Trash. Check your connection and try again."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/Check your connection/);
    expect(screen.getByRole("dialog", { name: "Move Reading to Trash?" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Move to Trash" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("holds the dialog while the move is in progress", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <GroupTrashConfirm
        name="Reading"
        linksCount={4}
        pending
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("button", { name: "Moving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
