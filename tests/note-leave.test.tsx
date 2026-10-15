// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
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
      fromTo: vi.fn(() => tween),
      timeline,
    },
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function sample(): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com/article",
    title: "Pricing page",
    customTitle: null,
    displayTitle: "Pricing page",
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

function renderOverlay({
  onNext = vi.fn(),
  onClose = vi.fn(),
  onNotesSaved = vi.fn(),
}: {
  onNext?: () => void;
  onClose?: () => void;
  onNotesSaved?: (link: LinkApiRow) => void;
} = {}) {
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
      link={sample()}
      groupName="References"
      groups={[{ id: "references", name: "References" }]}
      originRect={null}
      onClose={onClose}
      onPrev={() => {}}
      onNext={onNext}
      onDelete={() => {}}
      onMove={() => {}}
      hasPrev={false}
      hasNext
      onNotesSaved={onNotesSaved}
    />,
  );
  return { onNext, onClose, onNotesSaved };
}

describe("leaving a link keeps the note", () => {
  it("moves on immediately when the note was not edited", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { onNext } = renderOverlay();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onNext).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves an edited note before opening the next link", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ link: sample() }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { onNext, onNotesSaved } = renderOverlay();

    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Bring this to the review" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(onNext).not.toHaveBeenCalled();
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce());
    expect(onNotesSaved).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "Bring this to the review" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/links/link-1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ notes: "Bring this to the review" }),
      }),
    );
  });

  it("stays on the link when the note cannot be saved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Could not save the note" }),
      })),
    );
    const { onClose } = renderOverlay();
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Do not lose this" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save the note",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Note")).toHaveValue("Do not lose this");
  });
});
