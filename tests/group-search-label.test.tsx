// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import GroupSearchCommand from "@/components/vault/GroupSearchCommand";

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  cleanup();
});

describe("group search field", () => {
  it("has a name that does not depend on the placeholder alone", () => {
    render(
      <GroupSearchCommand
        value=""
        onChange={() => {}}
        groups={[]}
        onSelectGroup={() => {}}
        placeholder="Search groups"
      />,
    );

    expect(screen.getByRole("combobox", { name: "Search groups" })).toBeInTheDocument();
  });

  it("clears a typed name from Escape and keeps the clear control easy to tap", () => {
    const onChange = vi.fn();
    render(
      <GroupSearchCommand
        value="read"
        onChange={onChange}
        groups={[{ id: "reading", name: "Reading" }]}
        onSelectGroup={() => {}}
        placeholder="Search groups"
      />,
    );

    const clear = screen.getByRole("button", { name: "Clear search" });
    expect(clear.className).toContain("size-6");
    const field = screen.getByRole("combobox", { name: "Search groups" });
    field.focus();
    fireEvent.keyDown(field, { key: "Escape" });
    expect(onChange).toHaveBeenCalledWith("");
    expect(field).toHaveFocus();
  });

  it("returns focus to the field when the search is cleared", () => {
    const onChange = vi.fn();
    render(
      <GroupSearchCommand
        value="read"
        onChange={onChange}
        groups={[{ id: "reading", name: "Reading" }]}
        onSelectGroup={() => {}}
        placeholder="Search groups"
      />,
    );

    const field = screen.getByRole("combobox", { name: "Search groups" });
    const clear = screen.getByRole("button", { name: "Clear search" });
    clear.focus();
    fireEvent.click(clear);
    expect(onChange).toHaveBeenCalledWith("");
    expect(field).toHaveFocus();
  });

  it("returns focus to the field when a miss is cleared", () => {
    const onChange = vi.fn();
    render(
      <GroupSearchCommand
        value="zzzz"
        onChange={onChange}
        groups={[]}
        onSelectGroup={() => {}}
        placeholder="Search groups"
      />,
    );

    const field = screen.getByRole("combobox", { name: "Search groups" });
    fireEvent.focus(field);
    const clear = screen.getAllByRole("button", { name: "Clear search" });
    clear[clear.length - 1]?.focus();
    fireEvent.click(clear[clear.length - 1]!);
    expect(onChange).toHaveBeenCalledWith("");
    expect(field).toHaveFocus();
  });

  it("returns focus to the field after jumping to a group", () => {
    const onSelectGroup = vi.fn();
    render(
      <GroupSearchCommand
        value="read"
        onChange={() => {}}
        groups={[{ id: "reading", name: "Reading" }]}
        onSelectGroup={onSelectGroup}
        placeholder="Search groups"
      />,
    );

    const field = screen.getByRole("combobox", { name: "Search groups" });
    fireEvent.focus(field);
    fireEvent.click(screen.getByText("Reading"));
    expect(onSelectGroup).toHaveBeenCalledWith("reading");
    expect(field).toHaveFocus();
  });

  it("keeps a long group name and a pasted miss inside the menu", () => {
    const name = "Research-notes-for-the-quarterly-review-archive-2026";
    const { rerender } = render(
      <GroupSearchCommand
        value="research"
        onChange={() => {}}
        groups={[{ id: "research", name }]}
        onSelectGroup={() => {}}
        placeholder="Search groups"
      />,
    );

    fireEvent.focus(screen.getByRole("combobox", { name: "Search groups" }));
    const label = screen.getByText(name);
    expect(label.className).toContain("truncate");

    const address = `https://example.com/${"a".repeat(80)}`;
    rerender(
      <GroupSearchCommand
        value={address}
        onChange={() => {}}
        groups={[]}
        onSelectGroup={() => {}}
        placeholder="Search groups"
      />,
    );
    fireEvent.focus(screen.getByRole("combobox", { name: "Search groups" }));

    const miss = screen.getByText(/No groups match/);
    expect(miss.textContent?.endsWith("…”")).toBe(true);
    expect((miss.textContent ?? "").length).toBeLessThan(address.length);
  });
});
