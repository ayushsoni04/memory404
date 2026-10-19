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

function link(id: string, groupId = "general"): LinkApiRow {
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
    groupId,
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
    groupLabel: () => "References",
  });

  return (
    <div>
      <button type="button" onClick={() => void actions.moveLinkToGroup(link("link-1"), "references")}>
        Move first
      </button>
      <button type="button" onClick={() => void actions.moveLinkToGroup(link("link-2"), "references")}>
        Move second
      </button>
      <button
        type="button"
        onClick={() => void actions.moveLinkToGroup(link("link-1", "references"), "references")}
      >
        Move first again
      </button>
      <UndoNotice
        notice={actions.undoNotice}
        onUndo={() => void actions.runUndo()}
        onDismiss={actions.dismissUndo}
      />
    </div>
  );
}

function movedBody(id: string) {
  return {
    ok: true,
    json: async () => ({ link: link(id, "references") }),
  };
}

describe("a group move already in flight", () => {
  it("ignores a second move for the same link until the first finishes", async () => {
    let releaseFirst: (value: unknown) => void = () => {};
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes("link-1") && fetchMock.mock.calls.length === 1) {
        return new Promise((resolve) => {
          releaseFirst = resolve;
        });
      }
      const id = String(url).includes("link-2") ? "link-2" : "link-1";
      return Promise.resolve(movedBody(id));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Move first" }));
    fireEvent.click(screen.getByRole("button", { name: "Move first" }));
    fireEvent.click(screen.getByRole("button", { name: "Move second" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      expect.stringContaining("/api/links/link-1"),
      expect.stringContaining("/api/links/link-2"),
    ]);

    releaseFirst(movedBody("link-1"));
    await waitFor(() => {
      expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Move first" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  it("lets the same link move again after the first move fails", async () => {
    let releaseFirst: (value: unknown) => void = () => {};
    const fetchMock = vi.fn(() => {
      if (fetchMock.mock.calls.length === 1) {
        return new Promise((resolve) => {
          releaseFirst = resolve;
        });
      }
      return Promise.resolve(movedBody("link-1"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Move first" }));
    fireEvent.click(screen.getByRole("button", { name: "Move first" }));
    expect(fetchMock).toHaveBeenCalledOnce();

    releaseFirst({
      ok: false,
      json: async () => ({ error: "Group not found" }),
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Group not found");

    fireEvent.click(screen.getByRole("button", { name: "Move first" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
