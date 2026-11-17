// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "@/components/CommandPalette";
import type { LinkApiRow } from "@/lib/links";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ links: [] }),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function expectPhoneField(element: HTMLElement, desktop: string) {
  expect(element.className).toContain("text-base");
  expect(element.className).toContain(desktop);
}

const savedLink: LinkApiRow = {
  id: "link-1",
  url: "https://example.com/pricing",
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

describe("command palette field size", () => {
  it("keeps search and the note at 16px on a phone", async () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        groups={[]}
        onSelectGroup={() => {}}
        onSaveUrl={async () => ({ ok: true, link: savedLink })}
      />,
    );

    const search = screen.getByPlaceholderText(/Search links/);
    expectPhoneField(search, "sm:text-sm");

    fireEvent.change(search, { target: { value: "https://example.com/pricing" } });
    fireEvent.click(await screen.findByText("Save https://example.com/pricing"));

    const note = await screen.findByRole("textbox", { name: "Add a note" });
    expectPhoneField(note, "sm:text-[13px]");
  });
});
