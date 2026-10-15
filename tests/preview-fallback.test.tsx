// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LinkCard from "@/components/LinkCard";
import { nextCardPreview } from "@/components/vault/preview-fallback";
import type { LinkApiRow } from "@/lib/links";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function sample(overrides: Partial<LinkApiRow> = {}): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com/article",
    title: "A saved article",
    customTitle: null,
    displayTitle: "A saved article",
    description: null,
    imageUrl: "https://cdn.example.com/shot.jpg",
    faviconUrl: "",
    tags: [],
    notes: null,
    groupId: "general",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("nextCardPreview", () => {
  it("tries the favicon once, then gives up", () => {
    expect(
      nextCardPreview(
        "https://cdn.example.com/shot.jpg",
        "https://www.google.com/s2/favicons?domain=example.com&sz=128",
        false,
      ),
    ).toContain("favicons");
    expect(
      nextCardPreview(
        "https://www.google.com/s2/favicons?domain=example.com&sz=128",
        "https://www.google.com/s2/favicons?domain=example.com&sz=128",
        false,
      ),
    ).toBeNull();
    expect(nextCardPreview("https://cdn.example.com/shot.jpg", null, true)).toBeNull();
  });
});

describe("LinkCard missing preview", () => {
  it("shows the site letter when there is no image", () => {
    render(<LinkCard link={sample({ imageUrl: "" })} onOpen={vi.fn()} />);
    const mark = screen.getByText("example.com");
    expect(mark.closest("[data-preview='missing']")).toBeTruthy();
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "A saved article" })).not.toBeInTheDocument();
  });

  it("shows the site letter after the screenshot and the favicon both fail", () => {
    render(<LinkCard link={sample()} onOpen={vi.fn()} />);
    const preview = screen.getByRole("img", { name: "A saved article" });
    fireEvent.error(preview);
    const favicon = screen.getByRole("img", { name: "A saved article" });
    expect(favicon.getAttribute("src")).toContain("favicons");
    fireEvent.error(favicon);
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "A saved article" })).not.toBeInTheDocument();
  });
});
