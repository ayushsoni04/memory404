// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "@/components/CommandPalette";
import type { LinkApiRow } from "@/lib/links";

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

const link: LinkApiRow = {
  id: "link-1",
  url: "https://linear.app/method",
  title: "Linear method",
  customTitle: null,
  displayTitle: "Linear method",
  description: null,
  imageUrl: "",
  faviconUrl: "",
  tags: [],
  notes: null,
  groupId: "reading",
  metadataStatus: "ready",
  createdAt: "2026-10-01T12:00:00.000Z",
  deletedAt: null,
};

describe("command palette search groups", () => {
  it("shows which group a matching link is in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ links: [link] }),
      }),
    );

    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        groups={[
          { id: "all", name: "All" },
          { id: "reading", name: "Reading" },
        ]}
        onSelectGroup={() => {}}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Search links/), {
      target: { value: "linear" },
    });

    expect(await screen.findByText("Linear method")).toBeInTheDocument();
    expect(screen.getByText("linear.app · in Reading")).toBeInTheDocument();
  });

  it("offers All once and does not list the stored General group", () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        groups={[
          { id: "all", name: "All" },
          { id: "general", name: "General" },
          { id: "reading", name: "Reading" },
        ]}
        onSelectGroup={() => {}}
      />,
    );

    expect(screen.getAllByText("All")).toHaveLength(1);
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.queryByText("General")).not.toBeInTheDocument();
  });
});