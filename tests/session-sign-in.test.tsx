// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ComponentProps, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { StatsTab } from "@/app/settings/_components/StatsTab";
import TrashPage from "@/app/trash/page";
import CommandPalette from "@/components/CommandPalette";
import VaultFeed from "@/components/vault/VaultFeed";
import type { LinkApiRow } from "@/lib/links";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/AddLinkCard", () => ({
  default: () => <div>Add link</div>,
}));

vi.mock("@/components/LinkCard", () => ({
  default: () => null,
}));

vi.mock("@/components/vault/PastePrompt", () => ({
  default: () => null,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const link: LinkApiRow = {
  id: "link-1",
  url: "https://example.com/article",
  title: "A saved article",
  customTitle: null,
  displayTitle: "A saved article",
  description: null,
  imageUrl: "",
  faviconUrl: "",
  tags: [],
  notes: null,
  groupId: "general",
  metadataStatus: "ready",
  createdAt: "2026-10-01T00:00:00.000Z",
  deletedAt: null,
};

function renderFeed(overrides: Partial<ComponentProps<typeof VaultFeed>> = {}) {
  render(
    <VaultFeed
      groupToolbar={<div>Toolbar</div>}
      openedGroupId="all"
      openedGroup={null}
      allLinksCount={1}
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
      sortedLinks={[link]}
      openLinkDetail={() => {}}
      feedImageSizes="50vw"
      hasMoreLinks={false}
      sentinelRef={{ current: null }}
      scrollRootRef={{ current: null }}
      {...overrides}
    />,
  );
}

describe("sign in after a dead session", () => {
  it("offers Sign in on Stats instead of another Retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      }),
    );

    render(<StatsTab bannerStyle="midnight" />);

    const link = await screen.findByRole("link", { name: "Sign in" });
    expect(link).toHaveAttribute(
      "href",
      "/login?redirect=%2Fsettings%3Ftab%3Dstatistics",
    );
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("offers Sign in when the library itself cannot load", () => {
    renderFeed({ fetchError: "Unauthorized", sortedLinks: [] });

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByText("Sign in, then open your library again.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("keeps Retry when the library failed for another reason", () => {
    renderFeed({ fetchError: "Could not load links", sortedLinks: [] });

    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("offers Sign in when a command-palette search loses the session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      }),
    );

    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        groups={[{ id: "all", name: "All" }]}
        onSelectGroup={() => {}}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Search links/), {
      target: { value: "pricing" },
    });

    const signIn = await screen.findByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("offers Sign in when Trash cannot load because the session died", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      }),
    );

    render(<TrashPage />);

    const signIn = await screen.findByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/login?redirect=%2Ftrash");
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});
