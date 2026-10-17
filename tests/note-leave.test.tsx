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
  onDelete = vi.fn(),
  onMove = vi.fn(),
  groups = [
    { id: "references", name: "References" },
    { id: "reading", name: "Reading" },
  ],
}: {
  onNext?: () => void;
  onClose?: () => void;
  onNotesSaved?: (link: LinkApiRow) => void;
  onDelete?: (id: string) => void;
  onMove?: (link: LinkApiRow, groupId: string) => void;
  groups?: { id: string; name: string }[];
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
      groups={groups}
      originRect={null}
      onClose={onClose}
      onPrev={() => {}}
      onNext={onNext}
      onDelete={onDelete}
      onMove={onMove}
      hasPrev={false}
      hasNext
      onNotesSaved={onNotesSaved}
    />,
  );
  return { onNext, onClose, onNotesSaved, onDelete, onMove };
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

  it("saves an edited note before moving the link to Trash", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ link: sample() }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { onDelete, onClose } = renderOverlay();

    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Keep this with the link" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move to Trash" }));

    expect(onDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("link-1"));
    expect(onClose).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/links/link-1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ notes: "Keep this with the link" }),
      }),
    );
  });

  it("explains a dead session and keeps the note", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      })),
    );
    renderOverlay();
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Do not lose this" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/session expired/i);
    expect(screen.getByLabelText("Note")).toHaveValue("Do not lose this");
  });

  it("explains a dropped connection and keeps the note", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    renderOverlay();
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Do not lose this" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Couldn't reach memory404/,
    );
    expect(screen.getByLabelText("Note")).toHaveValue("Do not lose this");
  });

  it("stays open when Trash is chosen and the note cannot be saved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Could not save the note" }),
      })),
    );
    const { onDelete, onClose } = renderOverlay();
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Do not lose this" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move to Trash" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save the note",
    );
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("saves an edited note before moving the link to another group", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ link: sample() }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { onMove } = renderOverlay();

    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Take this to Reading" },
    });
    fireEvent.change(screen.getByLabelText("Move to group"), {
      target: { value: "reading" },
    });

    expect(onMove).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({ id: "link-1" }),
        "reading",
      ),
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("saves an edited note before closing from the empty area", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ link: sample() }),
      })),
    );
    const { onClose } = renderOverlay();
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Still here" },
    });
    const pad = document.querySelector(".px-6.pb-10");
    expect(pad).toBeTruthy();
    fireEvent.click(pad!);
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
