// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SearchResultText from "@/components/vault/SearchResultText";
import { visibleSearchNote } from "@/lib/search-note";
import type { LinkApiRow } from "@/lib/links";

afterEach(() => {
  cleanup();
});

function sample(notes: string | null): LinkApiRow {
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
    notes,
    groupId: "references",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

describe("search result notes", () => {
  it("keeps a written note and drops a blank one", () => {
    expect(visibleSearchNote("  Remember the pricing section.  ")).toBe(
      "Remember the pricing section.",
    );
    expect(visibleSearchNote("   ")).toBeNull();
    expect(visibleSearchNote(null)).toBeNull();
  });

  it("shows the note between the title and the host", () => {
    render(<SearchResultText link={sample("Remember the pricing section.")} />);
    const title = screen.getByText("Pricing page");
    const note = screen.getByText("Remember the pricing section.");
    const host = screen.getByText("example.com");
    expect(title.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(note.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the host when the link has no note", () => {
    render(<SearchResultText link={sample(null)} />);
    expect(screen.getByText("Pricing page")).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.queryByText("Remember the pricing section.")).not.toBeInTheDocument();
  });

  it("puts the group on the same line as the host", () => {
    render(<SearchResultText link={sample(null)} groupLabel="Reading" />);
    const title = screen.getByText("Pricing page");
    const place = screen.getByText("example.com · in Reading");
    expect(title.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps a long title, note, and group inside the result", () => {
    const title = "A".repeat(80);
    const notes = "B".repeat(80);
    const groupLabel = "Research-notes-for-the-quarterly-review-archive-2026";
    render(
      <SearchResultText
        link={{ ...sample(notes), displayTitle: title, title }}
        groupLabel={groupLabel}
      />,
    );

    const titleLine = screen.getByText(title);
    expect(titleLine.className).toContain("truncate");
    expect(titleLine.className).toContain("min-w-0");
    expect(titleLine).toHaveAttribute("title", title);

    const noteLine = screen.getByText(notes);
    expect(noteLine.className).toContain("line-clamp-2");
    expect(noteLine.className).toContain("[overflow-wrap:anywhere]");
    expect(noteLine).toHaveAttribute("title", notes);

    const place = screen.getByText(`example.com · in ${groupLabel}`);
    expect(place.className).toContain("truncate");
    expect(place.className).toContain("min-w-0");
    expect(place).toHaveAttribute("title", `example.com · in ${groupLabel}`);
  });
});