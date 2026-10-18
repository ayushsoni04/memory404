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
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Search groups" }), {
      key: "Escape",
    });
    expect(onChange).toHaveBeenCalledWith("");
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
