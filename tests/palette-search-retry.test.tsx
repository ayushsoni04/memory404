// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "@/components/CommandPalette";

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
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPalette() {
  render(
    <CommandPalette
      open
      onOpenChange={() => {}}
      groups={[]}
      onSelectGroup={() => {}}
    />,
  );
}

describe("command palette search recovery", () => {
  it("leaves the field focused when the first search fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Search failed" }),
      }),
    );

    renderPalette();
    const field = screen.getByPlaceholderText(/Search links/);
    field.focus();
    fireEvent.change(field, { target: { value: "pricing" } });

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(retry.className).toContain("min-h-11");
    expect(retry.className).toContain("sm:min-h-8");
    expect(field).toHaveFocus();
  });

  it("returns to Retry when searching again still fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Search failed" }),
      }),
    );

    renderPalette();
    const field = screen.getByPlaceholderText(/Search links/);
    fireEvent.change(field, { target: { value: "pricing" } });
    const retry = await screen.findByRole("button", { name: "Retry" });
    fireEvent.click(retry);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry" })).toHaveFocus();
    });
  });

  it("makes a miss and the shortcuts control easier to tap", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ links: [] }),
      }),
    );

    renderPalette();
    fireEvent.change(screen.getByPlaceholderText(/Search links/), {
      target: { value: "zzzz-no-match" },
    });

    const clear = await screen.findByRole("button", { name: "Clear search" });
    expect(clear.className).toContain("min-h-11");
    expect(clear.className).toContain("sm:min-h-8");
    expect(clear.className).toContain("focus-visible:ring-2");

    const shortcuts = screen.getByRole("button", { name: "Show keyboard shortcuts" });
    expect(shortcuts.className).toContain("min-h-11");
    expect(shortcuts.className).toContain("min-w-11");
    expect(shortcuts.className).toContain("focus-visible:ring-2");
    expect(shortcuts.className).toContain("sm:min-h-8");
  });
});
