// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShortcutHelp from "@/components/vault/ShortcutHelp";
import { ShortcutButton } from "@/components/vault/ShortcutButton";
import VaultFeed from "@/components/vault/VaultFeed";

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/AddLinkCard", () => ({
  default: () => <div>Add link</div>,
}));

vi.mock("@/components/LinkCard", () => ({
  default: () => <article>Link</article>,
}));

vi.mock("@/components/vault/PastePrompt", () => ({
  default: () => <div>Paste</div>,
}));

afterEach(() => {
  cleanup();
});

describe("shortcut discovery", () => {
  it("opens the shortcut list from a labeled control and returns focus", () => {
    render(
      <>
        <ShortcutButton />
        <ShortcutHelp />
      </>,
    );

    const button = screen.getByRole("button", { name: "Keyboard shortcuts" });
    expect(button.className).toContain("h-11");
    expect(button.className).toContain("sm:h-8");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    button.focus();
    fireEvent.click(button);
    expect(
      screen.getByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Show these shortcuts")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("sits in the library header next to the link count", () => {
    render(
      <VaultFeed
        groupToolbar={<div>Toolbar</div>}
        openedGroupId="all"
        openedGroup={null}
        allLinksCount={3}
        groupsError={null}
        missingGroupNotice={null}
        loadGroups={async () => undefined}
        loadingLinks={false}
        fetchError={null}
        loadMoreError={null}
        retryLoadMore={async () => undefined}
        loadLinks={async () => undefined}
        gridSize="default"
        generalGroup={null}
        saveLink={async () => ({ ok: false, error: "unused" })}
        onLinkSaved={() => {}}
        enteringLinkId={null}
        sortedLinks={[]}
        openLinkDetail={() => {}}
        feedImageSizes="50vw"
        hasMoreLinks={false}
        sentinelRef={{ current: null }}
        scrollRootRef={{ current: null }}
      />,
    );

    expect(screen.getByRole("heading", { name: "All Links" })).toBeInTheDocument();
    expect(screen.getByText("3 links")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Keyboard shortcuts" }),
    ).toBeInTheDocument();
  });
});
