// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

describe("open link note", () => {
  it("puts a failed save on the note and returns there", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Could not save the note" }),
      })),
    );

    render(
      <LinkDetailOverlay
        link={sample()}
        groupName="References"
        groups={[{ id: "references", name: "References" }]}
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

    const note = screen.getByRole("textbox", { name: "Note" });
    fireEvent.change(note, { target: { value: "A newer reminder." } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not save the note");
    expect(alert).toHaveAttribute("id", "link-note-error-link-1");
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(note).toHaveAttribute("aria-describedby", expect.stringContaining("link-note-error-link-1"));
    expect(note).toHaveFocus();
    expect(
      alert.compareDocumentPosition(screen.getByRole("button", { name: "Save note" })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
