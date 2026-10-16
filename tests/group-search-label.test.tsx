// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
});
