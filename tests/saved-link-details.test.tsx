// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LinkDetailOverlay from "@/components/LinkDetailOverlay";
import { formatSavedDate } from "@/lib/links";
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

function sample(overrides: Partial<LinkApiRow> = {}): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com/a-very-long-article-path-that-should-stay-on-the-page",
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

describe("saved link details", () => {
  it("shows the address and the calendar day", () => {
    const link = sample();
    renderOverlay(link);

    const address = screen.getByRole("link", { name: link.url });
    expect(address).toHaveAttribute("href", link.url);
    expect(address.className).toContain("break-all");
    expect(address.className).toContain("line-clamp-2");

    const saved = screen.getByText(/Saved /);
    expect(saved.tagName).toBe("TIME");
    expect(saved).toHaveAttribute("dateTime", link.createdAt);
    expect(saved).toHaveAttribute("title", formatSavedDate(link.createdAt));
  });

  it("leaves the saved line off when the timestamp cannot be read", () => {
    renderOverlay(sample({ createdAt: "not-a-date" }));
    expect(screen.queryByText(/^Saved/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: sample().url }),
    ).toBeInTheDocument();
  });
});
