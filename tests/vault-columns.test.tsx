// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import VaultColumns, {
  vaultFeedColumnClass,
  vaultSidebarColumnClass,
} from "@/components/vault/VaultColumns";

afterEach(() => {
  cleanup();
});

describe("VaultColumns", () => {
  it("puts the feed before the sidebar, and the sidebar on the left when wide", () => {
    render(
      <div className="grid">
        <VaultColumns
          feed={<h1>All Links</h1>}
          sidebar={<nav>Groups</nav>}
          footer={<p>Footer</p>}
        />
      </div>,
    );

    const feed = document.querySelector("[data-vault-column='feed']");
    const sidebar = document.querySelector("[data-vault-column='sidebar']");
    expect(feed).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(
      feed!.compareDocumentPosition(sidebar!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(feed).toHaveClass(...vaultFeedColumnClass.split(" "));
    expect(sidebar).toHaveClass(...vaultSidebarColumnClass.split(" "));
    expect(feed).toContainElement(screen.getByRole("heading", { name: "All Links" }));
    expect(sidebar).toContainElement(screen.getByRole("navigation"));
    expect(
      sidebar!.compareDocumentPosition(screen.getByText("Footer")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
