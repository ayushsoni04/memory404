// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LinkCard from "@/components/LinkCard";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
import { FaviconImage } from "@/components/vault/FaviconImage";
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
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
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
    faviconUrl: "https://cdn.example.com/icon.png",
    tags: [],
    notes: null,
    groupId: "general",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("FaviconImage", () => {
  it("removes the icon when the file fails", () => {
    render(<FaviconImage src="https://cdn.example.com/icon.png" size={18} className="size-4" />);
    const icon = document.querySelector("[data-favicon]");
    expect(icon).toHaveAttribute("width", "18");
    fireEvent.error(icon!);
    expect(document.querySelector("[data-favicon]")).toBeNull();
  });
});

describe("broken site icons", () => {
  it("drops a failed icon on a library card and keeps the preview", () => {
    render(<LinkCard link={sample()} onOpen={vi.fn()} />);
    expect(screen.getByRole("img", { name: "A saved article" })).toBeInTheDocument();
    const icon = document.querySelector("[data-favicon]");
    expect(icon?.getAttribute("src")).toContain("icon.png");
    fireEvent.error(icon!);
    expect(document.querySelector("[data-favicon]")).toBeNull();
    expect(screen.getByRole("img", { name: "A saved article" })).toBeInTheDocument();
  });

  it("drops a failed icon in the open link and keeps the site name", () => {
    render(
      <LinkDetailOverlay
        link={sample({ imageUrl: "", displayTitle: "Pricing page", title: "Pricing page" })}
        groupName="References"
        groups={[{ id: "general", name: "General" }]}
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
    expect(screen.getByText("example.com")).toBeInTheDocument();
    const icon = document.querySelector("[data-favicon]");
    expect(icon).toHaveAttribute("width", "18");
    fireEvent.error(icon!);
    expect(document.querySelector("[data-favicon]")).toBeNull();
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });
});
