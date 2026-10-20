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

const savedLink: LinkApiRow = {
  id: "link-1",
  url: "https://example.com/pricing",
  title: "Pricing page",
  customTitle: null,
  displayTitle: "Pricing page",
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

function renderPalette(
  onSaveUrl: (url: string) => Promise<{ ok: true; link: LinkApiRow } | { ok: false; error: string }>,
) {
  render(
    <CommandPalette
      open
      onOpenChange={() => {}}
      groups={[{ id: "all", name: "All" }]}
      onSelectGroup={() => {}}
      onSaveUrl={onSaveUrl}
    />,
  );
}

async function offerSave() {
  fireEvent.change(screen.getByPlaceholderText(/Search links/), {
    target: { value: "https://example.com/pricing" },
  });
  await waitFor(() => {
    expect(screen.getByText("Save https://example.com/pricing")).toBeInTheDocument();
  });
}

describe("command palette saves once", () => {
  it("ignores a second save of the typed address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ links: [] }),
      }),
    );
    let release: (value: { ok: true; link: LinkApiRow }) => void = () => {};
    const onSaveUrl = vi.fn(
      () =>
        new Promise<{ ok: true; link: LinkApiRow }>((resolve) => {
          release = resolve;
        }),
    );
    renderPalette(onSaveUrl);
    await offerSave();

    const save = screen.getByText("Save https://example.com/pricing");
    fireEvent.click(save);
    fireEvent.click(save);
    expect(onSaveUrl).toHaveBeenCalledTimes(1);

    release({ ok: true, link: savedLink });
    expect(await screen.findByText("Link saved")).toBeInTheDocument();
    expect(onSaveUrl).toHaveBeenCalledTimes(1);
  });

  it("ignores a second Save note until the first one finishes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/links?")) {
        return { ok: true, json: async () => ({ links: [] }) };
      }
      return new Promise(() => {});
    });
    vi.stubGlobal("fetch", fetchMock);
    renderPalette(async () => ({ ok: true, link: savedLink }));
    await offerSave();
    fireEvent.click(screen.getByText("Save https://example.com/pricing"));

    const notes = await screen.findByLabelText("Add a note");
    fireEvent.change(notes, { target: { value: "Remember the pricing section." } });
    const saveNote = screen.getByRole("button", { name: "Save note" });
    fireEvent.click(saveNote);
    fireEvent.click(saveNote);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    });
    const noteSaves = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/api/links/link-1"),
    );
    expect(noteSaves).toHaveLength(1);
  });
});
