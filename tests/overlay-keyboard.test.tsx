// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
import { useLinkActions } from "@/components/vault/useLinkActions";
import type { LinkApiRow } from "@/lib/links";

vi.mock("gsap", () => {
  const tween = { kill: vi.fn() };
  const timeline = () => {
    const tl = {
      to: vi.fn(() => tl),
      add: vi.fn(() => tl),
      kill: vi.fn(),
    };
    return tl;
  };
  return {
    default: {
      set: vi.fn(),
      to: vi.fn(() => tween),
      timeline,
    },
  };
});

afterEach(() => {
  cleanup();
});

function sampleLink(id: string, title: string): LinkApiRow {
  return {
    id,
    url: "https://example.com/article",
    title,
    customTitle: null,
    displayTitle: title,
    description: null,
    imageUrl: "",
    faviconUrl: "",
    tags: [],
    notes: "Remember the pricing section.",
    groupId: "references",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

function renderOverlay(onNext = vi.fn()) {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
  render(
    <LinkDetailOverlay
      link={sampleLink("link-1", "Pricing page")}
      groupName="References"
      groups={[{ id: "references", name: "References" }]}
      originRect={null}
      onClose={() => {}}
      onPrev={() => {}}
      onNext={onNext}
      onDelete={() => {}}
      onMove={() => {}}
      hasPrev={false}
      hasNext
    />,
  );
}

describe("link detail keyboard", () => {
  it("names the action Move to Trash, matching the undo toast", () => {
    const onDelete = vi.fn();
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    render(
      <LinkDetailOverlay
        link={sampleLink("link-1", "Pricing page")}
        groupName="References"
        groups={[{ id: "references", name: "References" }]}
        originRect={null}
        onClose={() => {}}
        onPrev={() => {}}
        onNext={() => {}}
        onDelete={onDelete}
        onMove={() => {}}
        hasPrev={false}
        hasNext={false}
      />,
    );

    expect(
      screen.getByText("You can restore it from Trash for 30 days."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Move to Trash" }));
    expect(onDelete).toHaveBeenCalledWith("link-1");
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("does not leave the note when ArrowRight is pressed inside it", () => {
    const onNext = vi.fn();
    renderOverlay(onNext);
    const note = screen.getByRole("textbox", { name: "Note" });
    note.focus();
    fireEvent.keyDown(note, { key: "ArrowRight" });
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Pricing page" })).toBeInTheDocument();
  });

  it("moves to the next link when ArrowRight is pressed on the dialog controls", () => {
    const onNext = vi.fn();
    renderOverlay(onNext);
    const close = screen.getByRole("button", { name: "Close" });
    close.focus();
    fireEvent.keyDown(close, { key: "ArrowRight" });
    expect(onNext).toHaveBeenCalledOnce();
  });
});

function FocusHarness() {
  const first = sampleLink("link-1", "Pricing page");
  const [links, setLinks] = useState([first]);
  const actions = useLinkActions({
    links,
    setLinks,
    openedGroupId: "references",
    setLinksCache: () => {},
    removeLinkFromPages: () => {},
    replaceLinkInPages: () => {},
    prependLinkToPages: () => {},
    sortedLinks: links,
  });

  return (
    <div>
      <button
        type="button"
        id="feed-card-link-1"
        data-feed-card=""
        onClick={(event) => actions.openLinkDetail(first, event.currentTarget)}
      >
        Pricing page
      </button>
      {actions.openedLink ? (
        <button type="button" onClick={actions.closeLinkDetail}>
          Close detail
        </button>
      ) : null}
    </div>
  );
}

describe("closing a link returns focus", () => {
  it("focuses the card that opened the detail", () => {
    render(<FocusHarness />);
    const card = screen.getByRole("button", { name: "Pricing page" });
    fireEvent.click(card);
    fireEvent.click(screen.getByRole("button", { name: "Close detail" }));
    expect(card).toHaveFocus();
  });
});
