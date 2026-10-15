// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
import { NOTE_COUNT_AT, NOTE_MAX, noteCountLabel } from "@/lib/note-limit";
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
});

function sampleLink(notes: string | null = null): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com/article",
    title: "A saved article",
    customTitle: null,
    displayTitle: "A saved article",
    description: null,
    imageUrl: "",
    faviconUrl: "",
    tags: [],
    notes,
    groupId: "general",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

function renderOverlay(notes: string | null) {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  render(
    <LinkDetailOverlay
      link={sampleLink(notes)}
      groupName="All"
      groups={[{ id: "general", name: "All" }]}
      originRect={null}
      onClose={() => {}}
      onPrev={() => {}}
      onNext={() => {}}
      onDelete={() => {}}
      onMove={() => {}}
      hasPrev={false}
      hasNext={false}
    />,
  );
}

describe("noteCountLabel", () => {
  it("stays quiet until a note is close to the limit", () => {
    expect(noteCountLabel("short")).toBeNull();
    expect(noteCountLabel("a".repeat(NOTE_COUNT_AT - 1))).toBeNull();
    expect(noteCountLabel("a".repeat(NOTE_COUNT_AT))).toBe("1,600 of 2,000");
    expect(noteCountLabel("a".repeat(NOTE_MAX + 1))).toBe("2,001 of 2,000");
  });
});

describe("note field count", () => {
  it("shows the count and blocks a note that is too long", () => {
    renderOverlay(null);
    const note = screen.getByLabelText("Note");
    expect(screen.queryByText(/of 2,000/)).not.toBeInTheDocument();

    fireEvent.change(note, { target: { value: "a".repeat(NOTE_COUNT_AT) } });
    expect(screen.getByText("1,600 of 2,000")).toBeInTheDocument();
    expect(note).toHaveAttribute("aria-describedby", "link-note-count-link-1");
    expect(screen.getByRole("button", { name: "Save note" })).toBeEnabled();

    fireEvent.change(note, { target: { value: "a".repeat(NOTE_MAX + 1) } });
    expect(screen.getByText("2,001 of 2,000")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Notes must be 2,000 characters or fewer.",
    );
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled();
  });
});
