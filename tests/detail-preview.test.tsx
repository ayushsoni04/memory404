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
      timeline,
    },
  };
});

afterEach(() => {
  cleanup();
});

function sampleLink(overrides: Partial<LinkApiRow> = {}): LinkApiRow {
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
    ...overrides,
  };
}

function renderOverlay(link: LinkApiRow) {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
  return render(
    <LinkDetailOverlay
      link={link}
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
}

describe("link detail preview", () => {
  it("uses a letter and a site icon when the saved preview is missing", () => {
    renderOverlay(sampleLink());
    const missing = document.querySelector("[data-preview='missing']");
    expect(missing).toHaveTextContent("E");
    expect(missing).toHaveTextContent("example.com");
    const icon = document.querySelector("img[width='18']");
    expect(icon?.getAttribute("src")).toContain("s2/favicons");
    expect(screen.queryByRole("img", { name: "Pricing page" })).not.toBeInTheDocument();
  });

  it("replaces a broken preview with the same letter the card uses", () => {
    renderOverlay(
      sampleLink({
        imageUrl: "https://images.example/missing.png",
        faviconUrl: "https://dummyimage.com/32",
      }),
    );
    fireEvent.error(screen.getByRole("img", { name: "Pricing page" }));
    const retried = screen.queryByRole("img", { name: "Pricing page" });
    if (retried) fireEvent.error(retried);
    expect(document.querySelector("[data-preview='missing']")).toHaveTextContent("E");
  });
});
