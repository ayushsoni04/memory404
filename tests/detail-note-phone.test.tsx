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
    notes: null,
    groupId: "references",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

describe("open link note on a phone", () => {
  it("keeps the note at 16px and Save note at 44px", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

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
    expect(note.className).toContain("text-base");
    expect(note.className).toContain("sm:text-sm");

    fireEvent.change(note, { target: { value: "Remember the pricing section." } });
    const save = screen.getByRole("button", { name: "Save note" });
    expect(save.className).toContain("h-11");
    expect(save.className).toContain("sm:h-8");
  });
});
