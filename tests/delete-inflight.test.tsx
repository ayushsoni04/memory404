// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UndoNotice from "@/components/vault/UndoNotice";
import { useLinkActions } from "@/components/vault/useLinkActions";
import type { LinkApiRow } from "@/lib/links";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function link(id: string): LinkApiRow {
  return {
    id,
    url: `https://example.com/${id}`,
    title: id,
    customTitle: null,
    displayTitle: id,
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

function Harness() {
  const [links, setLinks] = useState<LinkApiRow[]>([link("link-1"), link("link-2")]);
  const actions = useLinkActions({
    links,
    setLinks,
    openedGroupId: "all",
    setLinksCache: () => {},
    removeLinkFromPages: () => {},
    replaceLinkInPages: () => {},
    prependLinkToPages: () => {},
    sortedLinks: links,
    groupLabel: () => "All",
  });

  return (
    <div>
      <button type="button" onClick={() => void actions.handleDelete("link-1")}>
        Trash first
      </button>
      <button type="button" onClick={() => void actions.handleDelete("link-2")}>
        Trash second
      </button>
      <UndoNotice
        notice={actions.undoNotice}
        onUndo={() => void actions.runUndo()}
        onDismiss={actions.dismissUndo}
      />
    </div>
  );
}

function deleted() {
  return { ok: true, json: async () => ({ ok: true }) };
}

describe("a move to Trash already in flight", () => {
  it("ignores a second Trash for the same link until the first finishes", async () => {
    let releaseFirst: (value: unknown) => void = () => {};
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes("link-1") && fetchMock.mock.calls.length === 1) {
        return new Promise((resolve) => {
          releaseFirst = resolve;
        });
      }
      return Promise.resolve(deleted());
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Trash first" }));
    fireEvent.click(screen.getByRole("button", { name: "Trash first" }));
    fireEvent.click(screen.getByRole("button", { name: "Trash second" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      expect.stringContaining("/api/links/link-1"),
      expect.stringContaining("/api/links/link-2"),
    ]);

    releaseFirst(deleted());
    expect(await screen.findByRole("status")).toHaveTextContent("Moved to Trash");

    fireEvent.click(screen.getByRole("button", { name: "Trash first" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  it("lets the same link move to Trash again after the first attempt fails", async () => {
    let releaseFirst: (value: unknown) => void = () => {};
    const fetchMock = vi.fn(() => {
      if (fetchMock.mock.calls.length === 1) {
        return new Promise((resolve) => {
          releaseFirst = resolve;
        });
      }
      return Promise.resolve(deleted());
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Trash first" }));
    fireEvent.click(screen.getByRole("button", { name: "Trash first" }));
    expect(fetchMock).toHaveBeenCalledOnce();

    releaseFirst({
      ok: false,
      json: async () => ({ error: "Failed to delete" }),
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Couldn't move that link to Trash. Try again.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Trash first" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
