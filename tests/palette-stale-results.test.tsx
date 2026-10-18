// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function link(id: string, title: string): LinkApiRow {
  return {
    id,
    url: `https://example.com/${id}`,
    title,
    customTitle: null,
    displayTitle: title,
    description: null,
    imageUrl: "",
    faviconUrl: "",
    tags: [],
    notes: null,
    groupId: "general",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

describe("command palette search", () => {
  it("hides the previous links while a new search is still loading", async () => {
    let releaseSecond: (value: unknown) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ links: [link("pricing", "Pricing page")] }),
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseSecond = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        groups={[{ id: "reading", name: "Reading" }]}
        onSelectGroup={() => {}}
      />,
    );

    const field = screen.getByPlaceholderText(/Search links/);
    fireEvent.change(field, { target: { value: "pricing" } });
    expect(await screen.findByText("Pricing page")).toBeInTheDocument();

    fireEvent.change(field, { target: { value: "notes" } });
    expect(screen.getByText("Searching links…")).toBeInTheDocument();
    expect(screen.queryByText("Pricing page")).not.toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    releaseSecond({
      ok: true,
      json: async () => ({ links: [link("notes", "Meeting notes")] }),
    });
    expect(await screen.findByText("Meeting notes")).toBeInTheDocument();
    expect(screen.queryByText("Pricing page")).not.toBeInTheDocument();
    expect(screen.queryByText("Searching links…")).not.toBeInTheDocument();
  });
});
