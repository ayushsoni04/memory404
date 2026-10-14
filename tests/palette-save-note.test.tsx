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
  onNoteSaved = vi.fn(),
  onOpenChange = vi.fn(),
) {
  render(
    <CommandPalette
      open
      onOpenChange={onOpenChange}
      groups={[{ id: "all", name: "All" }]}
      onSelectGroup={() => {}}
      onSaveUrl={onSaveUrl}
      onNoteSaved={onNoteSaved}
    />,
  );
  return { onNoteSaved, onOpenChange };
}

async function offerSave() {
  fireEvent.change(screen.getByPlaceholderText(/Search links/), {
    target: { value: "https://example.com/pricing" },
  });
  await waitFor(() => {
    expect(screen.getByText("Save https://example.com/pricing")).toBeInTheDocument();
  });
}

describe("CommandPalette note after save", () => {
  it("asks for a note after a URL is saved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ links: [] }),
      }),
    );
    const onSaveUrl = vi.fn().mockResolvedValue({ ok: true, link: savedLink });
    const { onOpenChange } = renderPalette(onSaveUrl);

    await offerSave();
    fireEvent.click(screen.getByText("Save https://example.com/pricing"));

    expect(await screen.findByText("Link saved")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the note when saving it fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/links?")) {
        return { ok: true, json: async () => ({ links: [] }) };
      }
      return { ok: false, json: async () => ({ error: "Could not save the note" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const onSaveUrl = vi.fn().mockResolvedValue({ ok: true, link: savedLink });
    const { onNoteSaved, onOpenChange } = renderPalette(onSaveUrl);

    await offerSave();
    fireEvent.click(screen.getByText("Save https://example.com/pricing"));
    const notes = await screen.findByLabelText("Notes");
    fireEvent.change(notes, { target: { value: "Remember the pricing section." } });
    fireEvent.click(screen.getByRole("button", { name: "Save Notes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the note");
    expect(notes).toHaveValue("Remember the pricing section.");
    expect(onNoteSaved).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe("CommandPalette search failure", () => {
  it("retries the same query without asking for it again", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Search failed"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ links: [savedLink] }),
      });
    vi.stubGlobal("fetch", fetchMock);
    renderPalette(vi.fn());

    fireEvent.change(screen.getByPlaceholderText(/Search links/), {
      target: { value: "pricing" },
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Search failed");
    expect(alert).toHaveTextContent("Your library is unchanged.");
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry.className).toContain("focus-visible:ring-2");

    fireEvent.click(retry);

    expect(await screen.findByText("Pricing page")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("search=pricing");
  });
});
