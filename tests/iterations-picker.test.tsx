// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IterationsPicker } from "@/components/vault/IterationsPicker";
import {
  ART_STYLE_BOOT_SCRIPT,
  ART_STYLE_KEY,
  applyArtStyle,
  currentArtStyle,
} from "@/lib/art-style";

vi.mock("@/lib/ui-sound", () => ({ playUiSound: vi.fn() }));

const saved = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => void saved.set(key, String(value)),
    removeItem: (key: string) => void saved.delete(key),
    clear: () => saved.clear(),
  },
});

afterEach(() => {
  cleanup();
  applyArtStyle("signal");
  saved.clear();
});

describe("iterations picker", () => {
  it("switches between signal and mono", () => {
    render(<IterationsPicker />);
    const root = document.documentElement;

    fireEvent.click(screen.getByRole("radio", { name: "Mono" }));
    expect(root.dataset.art).toBe("signal");
    expect(root.dataset.tone).toBe("mono");
    expect(saved.get(ART_STYLE_KEY)).toBe("mono");
    expect(screen.getByRole("radio", { name: "Mono" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("radio", { name: "Signal" }));
    expect(root.dataset.art).toBe("signal");
    expect(root.dataset.tone).toBeUndefined();
    expect(currentArtStyle()).toBe("signal");
    expect(saved.has(ART_STYLE_KEY)).toBe(false);
    expect(screen.queryByRole("radio", { name: "Old" })).not.toBeInTheDocument();
  });

  it("restores mono before first paint", () => {
    saved.set(ART_STYLE_KEY, "mono");
    new Function(ART_STYLE_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.art).toBe("signal");
    expect(document.documentElement.dataset.tone).toBe("mono");
    expect(currentArtStyle()).toBe("mono");
  });
});
