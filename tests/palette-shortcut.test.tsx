// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "@/components/CommandPalette";
import {
  anotherDialogIsOpen,
  isPaletteShortcut,
  shouldTogglePalette,
} from "@/lib/palette-shortcut";

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

describe("palette shortcut", () => {
  it("recognizes Ctrl+K and ⌘K, and leaves other chords alone", () => {
    expect(isPaletteShortcut({ key: "k", ctrlKey: true, metaKey: false })).toBe(true);
    expect(isPaletteShortcut({ key: "K", ctrlKey: false, metaKey: true })).toBe(true);
    expect(isPaletteShortcut({ key: "k", ctrlKey: false, metaKey: false })).toBe(false);
    expect(isPaletteShortcut({ key: "p", ctrlKey: true, metaKey: false })).toBe(false);
  });

  it("stays closed while another dialog is open, and still closes itself", () => {
    expect(shouldTogglePalette(false, true)).toBe(false);
    expect(shouldTogglePalette(false, false)).toBe(true);
    expect(shouldTogglePalette(true, true)).toBe(true);
  });

  it("does not open search over a link that is already open", () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        open={false}
        onOpenChange={onOpenChange}
        groups={[]}
        onSelectGroup={() => {}}
      />,
    );
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.textContent = "Pricing page";
    document.body.append(dialog);

    expect(anotherDialogIsOpen()).toBe(true);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(onOpenChange).not.toHaveBeenCalled();

    dialog.remove();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("closes search with the same shortcut", () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        groups={[]}
        onSelectGroup={() => {}}
      />,
    );
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
