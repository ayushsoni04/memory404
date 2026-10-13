// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UndoNotice from "@/components/vault/UndoNotice";
import { useLinkActions } from "@/components/vault/useLinkActions";
import type { LinkApiRow } from "@/lib/links";
import { UNDO_MS } from "@/components/vault/undo-offer";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function sample(): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com/pricing",
    title: "Pricing page",
    customTitle: null,
    displayTitle: "Pricing page",
    description: null,
    imageUrl: "",
    faviconUrl: "",
    tags: [],
    notes: "Remember the pricing section.",
    groupId: "general",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

function Harness({
  openedGroupId = "all",
  onPrepend = () => {},
}: {
  openedGroupId?: string;
  onPrepend?: (link: LinkApiRow) => void;
}) {
  const [links, setLinks] = useState<LinkApiRow[]>([sample()]);
  const actions = useLinkActions({
    links,
    setLinks,
    openedGroupId,
    setLinksCache: () => {},
    removeLinkFromPages: () => {},
    replaceLinkInPages: () => {},
    prependLinkToPages: onPrepend,
    sortedLinks: links,
    groupLabel: (id) => (id === "references" ? "References" : "All"),
  });

  return (
    <div>
      <button type="button" onClick={() => void actions.handleDelete("link-1")}>
        Delete link
      </button>
      <button
        type="button"
        onClick={() => void actions.moveLinkToGroup(sample(), "references")}
      >
        Move link
      </button>
      <ul>
        {links.map((link) => (
          <li key={link.id}>{link.displayTitle}</li>
        ))}
      </ul>
      <UndoNotice
        notice={actions.undoNotice}
        onUndo={() => void actions.runUndo()}
        onDismiss={actions.dismissUndo}
      />
      <textarea aria-label="Note" defaultValue="" />
    </div>
  );
}

describe("undo after delete and move", () => {
  it("offers undo after a delete and restores the link", async () => {
    const prepend = vi.fn();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      return {
        ok: true,
        json: async () => ({ ok: true, link: { ...sample(), groupId: "general" } }),
        url,
        method: init?.method,
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness onPrepend={prepend} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete link" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Moved to Trash");
    expect(screen.queryByText("Pricing page")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => {
      expect(screen.getByText("Pricing page")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/trash/links/link-1"),
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(prepend).toHaveBeenCalledWith(
      expect.objectContaining({ id: "link-1", deletedAt: null }),
    );
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("undoes a move back to the previous group", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(init?.body ? JSON.parse(String(init.body)) : null);
        return {
          ok: true,
          json: async () => ({
            link: { ...sample(), groupId: "references" },
          }),
        };
      }),
    );

    render(<Harness openedGroupId="general" />);
    fireEvent.click(screen.getByRole("button", { name: "Move link" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Moved to References");
    });
    expect(screen.queryByText("Pricing page")).not.toBeInTheDocument();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ link: sample() }),
      })),
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => {
      expect(screen.getByText("Pricing page")).toBeInTheDocument();
    });
  });

  it("does not undo from Ctrl+Z while a note is focused", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) })),
    );
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Delete link" }));
    await screen.findByRole("button", { name: "Undo" });

    const note = screen.getByRole("textbox", { name: "Note" });
    note.focus();
    fireEvent.keyDown(note, { key: "z", ctrlKey: true });
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("hides the offer after the undo window", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) })),
    );
    render(<Harness />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete link" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS);
    });
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });
});
