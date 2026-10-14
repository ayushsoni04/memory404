import { describe, expect, it } from "vitest";
import { horizontalScrollEdges } from "@/components/vault/pill-scroll-fade";

describe("horizontalScrollEdges", () => {
  it("hides both fades when the row fits", () => {
    expect(horizontalScrollEdges(0, 240, 240)).toEqual({
      start: false,
      end: false,
    });
    expect(horizontalScrollEdges(0, 240, 241)).toEqual({
      start: false,
      end: false,
    });
  });

  it("shows only the end fade before the row is scrolled", () => {
    expect(horizontalScrollEdges(0, 200, 640)).toEqual({
      start: false,
      end: true,
    });
  });

  it("shows both fades in the middle and only the start fade at the end", () => {
    expect(horizontalScrollEdges(40, 200, 640)).toEqual({
      start: true,
      end: true,
    });
    expect(horizontalScrollEdges(440, 200, 640)).toEqual({
      start: true,
      end: false,
    });
  });
});
