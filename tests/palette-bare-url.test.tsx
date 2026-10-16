// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "@/components/CommandPalette";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
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

describe("command palette bare URL", () => {
  it("offers to save a host that left off https", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ links: [] }),
      }),
    );

    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        groups={[]}
        onSelectGroup={() => {}}
        onSaveUrl={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Search links/), {
      target: { value: "linear.app/docs" },
    });

    expect(await screen.findByText("Save https://linear.app/docs")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/No matches/)).not.toBeInTheDocument();
    });
  });

  it("does not offer a save when that host is already in the results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          links: [
            {
              id: "link-1",
              url: "https://linear.app/docs",
              title: "Linear docs",
              customTitle: null,
              displayTitle: "Linear docs",
              description: null,
              imageUrl: "",
              faviconUrl: "",
              tags: [],
              notes: null,
              groupId: "general",
              metadataStatus: "ready",
              createdAt: "2026-10-01T12:00:00.000Z",
              deletedAt: null,
            },
          ],
        }),
      }),
    );

    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        groups={[{ id: "general", name: "General" }]}
        onSelectGroup={() => {}}
        onSaveUrl={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Search links/), {
      target: { value: "linear.app/docs" },
    });

    expect(await screen.findByText("Linear docs")).toBeInTheDocument();
    expect(screen.queryByText(/Save https:\/\/linear.app\/docs/)).not.toBeInTheDocument();
  });
});
