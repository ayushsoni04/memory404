// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLinkActions } from "@/components/vault/useLinkActions";
import type { LinkApiRow } from "@/lib/links";

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function link(title = "Pricing page"): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com/pricing",
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

function Harness() {
  const [links, setLinks] = useState<LinkApiRow[]>([link()]);
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
  const opened = actions.openedLink;
  const actionError = opened
    ? (actions.deleteErrors[opened.id] ?? actions.patchErrors[opened.id] ?? null)
    : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const origin = document.createElement("button");
          document.body.appendChild(origin);
          actions.openLinkDetail(opened ?? links[0] ?? link(), origin);
        }}
      >
        Open link
      </button>
      <button type="button" onClick={() => void actions.moveLinkToGroup(link(), "references")}>
        Move link
      </button>
      <button
        type="button"
        onClick={() => actions.updateSavedLink({ ...link(), displayTitle: "Launch notes" })}
      >
        Save name
      </button>
      <button type="button" onClick={actions.closeLinkDetail}>
        Close
      </button>
      {opened ? <p>Open {opened.displayTitle}</p> : null}
      {actionError ? <p role="alert">{actionError}</p> : null}
    </div>
  );
}

describe("stale link actions", () => {
  it("clears a failed move after the link is saved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({}),
      })),
    );
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open link" }));
    fireEvent.click(screen.getByRole("button", { name: "Move link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't move that link. Try again.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Open Launch notes")).toBeInTheDocument();
  });

  it("does not bring a failed move back when the link is opened again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({}),
      })),
    );
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open link" }));
    fireEvent.click(screen.getByRole("button", { name: "Move link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't move that link. Try again.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByText("Open Pricing page")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open link" }));
    expect(screen.getByText("Open Pricing page")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
