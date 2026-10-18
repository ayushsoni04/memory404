// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GroupSearchCommand from "@/components/vault/GroupSearchCommand";

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
});
