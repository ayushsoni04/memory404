// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LinkCard from "@/components/LinkCard";
import type { LinkApiRow } from "@/lib/links";

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
    groupId: "general",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

describe("link card actions", () => {
  it("keeps copy and open outside the details button", () => {
    const onOpen = vi.fn();
    render(<LinkCard link={sample()} onOpen={onOpen} />);

    const details = screen.getByRole("button", { name: "Open details for Pricing page" });
    const copy = screen.getByRole("button", { name: "Copy link: example.com" });
    const original = screen.getByRole("link", { name: "Open original link: example.com" });

    expect(details.contains(copy)).toBe(false);
    expect(details.contains(original)).toBe(false);
    expect(copy.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();

    fireEvent.click(copy);
    fireEvent.click(original);
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(details);
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
