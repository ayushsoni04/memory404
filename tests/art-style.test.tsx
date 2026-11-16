// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import {
  countReadout,
  hexReadout,
} from "@/components/vault/SignalPoster";
import {
  ART_STYLE_BOOT_SCRIPT,
  ART_STYLE_KEY,
  applyArtStyle,
  currentArtStyle,
  parseArtStyle,
  readStoredArtStyle,
} from "@/lib/art-style";

// This jsdom setup ships no localStorage, so give the page a small one.
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
  saved.clear();
  delete document.documentElement.dataset.art;
  delete document.documentElement.dataset.tone;
});

describe("art style", () => {
  it("is Signal unless mono is asked for", () => {
    expect(parseArtStyle("signal")).toBe("signal");
    expect(parseArtStyle("mono")).toBe("mono");
    expect(parseArtStyle(null)).toBe("signal");
    expect(parseArtStyle("neon")).toBe("signal");
    // A value saved by a build that still had the old look.
    expect(parseArtStyle("default")).toBe("signal");
    expect(readStoredArtStyle()).toBe("signal");
    expect(currentArtStyle()).toBe("signal");
  });

  it("keeps Signal on <html> and only remembers the mono tone", () => {
    applyArtStyle("mono");
    expect(document.documentElement.dataset.art).toBe("signal");
    expect(document.documentElement.dataset.tone).toBe("mono");
    expect(saved.get(ART_STYLE_KEY)).toBe("mono");
    expect(currentArtStyle()).toBe("mono");
    expect(readStoredArtStyle()).toBe("mono");

    applyArtStyle("signal");
    expect(document.documentElement.dataset.art).toBe("signal");
    expect(document.documentElement.dataset.tone).toBeUndefined();
    expect(saved.has(ART_STYLE_KEY)).toBe(false);
    expect(currentArtStyle()).toBe("signal");
  });

  it("restores a saved mono tone before the page paints", () => {
    saved.set(ART_STYLE_KEY, "mono");
    new Function(ART_STYLE_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.tone).toBe("mono");
  });

  it("leaves the page alone for any other saved value", () => {
    for (const value of ["signal", "default", "neon"]) {
      saved.set(ART_STYLE_KEY, value);
      new Function(ART_STYLE_BOOT_SCRIPT)();
      expect(document.documentElement.dataset.tone).toBeUndefined();
    }
  });
});

describe("poster readouts", () => {
  it("formats counts for the mono strips", () => {
    expect(hexReadout(7)).toBe("0X07");
    expect(hexReadout(26)).toBe("0X1A");
    expect(hexReadout(-3)).toBe("0X00");
    expect(countReadout(293)).toBe("0293");
    expect(countReadout(12345)).toBe("12345");
    expect(countReadout(Number.NaN)).toBe("0000");
  });
});
