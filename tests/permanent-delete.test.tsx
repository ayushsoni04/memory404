// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PermanentDeleteConfirm from "@/app/trash/PermanentDeleteConfirm";
import { permanentDeleteCopy } from "@/app/trash/permanent-delete";

afterEach(() => {
  cleanup();
});

describe("permanentDeleteCopy", () => {
  it("names the item and says the delete cannot be undone", () => {
    expect(permanentDeleteCopy({ kind: "empty", count: 3 }).title).toBe("Empty Trash?");
    expect(permanentDeleteCopy({ kind: "empty", count: 3 }).detail).toMatch(/3 items/);
    expect(permanentDeleteCopy({ kind: "empty", count: 1 }).detail).toMatch(/1 item/);
    expect(
      permanentDeleteCopy({ kind: "link", id: "1", title: "Pricing page" }).title,
    ).toBe("Delete “Pricing page” forever?");
    expect(
      permanentDeleteCopy({ kind: "group", id: "g", name: "Reading" }).detail,
    ).toMatch(/Links that were deleted with this group/);
    expect(
      permanentDeleteCopy({ kind: "group", id: "g", name: "General" }).title,
    ).toBe("Delete “All” forever?");
    expect(
      permanentDeleteCopy({ kind: "group", id: "g", name: "Reading" }).title,
    ).toBe("Delete “Reading” forever?");
  });
});

describe("PermanentDeleteConfirm", () => {
  it("cancels from Escape and from Cancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <PermanentDeleteConfirm
        pending={{ kind: "link", id: "1", title: "Pricing page" }}
        busy={false}
        error={null}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Delete “Pricing page” forever?" }),
    ).toBeInTheDocument();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toHaveFocus();
    expect(cancel.className).toContain("focus-visible:ring-2");
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("button", { name: "Delete forever" })).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms only from Delete forever", () => {
    const onConfirm = vi.fn();
    render(
      <PermanentDeleteConfirm
        pending={{ kind: "empty", count: 2 }}
        busy={false}
        error="Network error — try again"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Network error — try again");
    fireEvent.click(screen.getByRole("button", { name: "Empty Trash" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
