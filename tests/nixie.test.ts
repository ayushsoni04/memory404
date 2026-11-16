import { describe, expect, it } from "vitest";
import {
  CATHODE_STACK,
  mulberry32,
  nixieDigitAt,
  nixieDigits,
  nixieDuration,
  planNixieTransition,
} from "@/lib/nixie";

describe("nixieDigits", () => {
  it("pads with zeros or blanks them", () => {
    expect(nixieDigits(293, 4)).toEqual([0, 2, 9, 3]);
    expect(nixieDigits(293, 4, false)).toEqual([null, 2, 9, 3]);
    expect(nixieDigits(0, 3, false)).toEqual([null, null, 0]);
    expect(nixieDigits(123456, 4)).toEqual([3, 4, 5, 6]);
    expect(nixieDigits(-5, 2)).toEqual([0, 0]);
  });
});

describe("planNixieTransition", () => {
  const from = nixieDigits(1299, 4);
  const to = nixieDigits(1300, 4);

  it("slot leaves unchanged tubes alone and lands every tube on its digit", () => {
    const tracks = planNixieTransition(from, to, "slot", undefined, mulberry32(7));
    expect(tracks[0]).toEqual([{ at: 0, digit: 1 }]);
    tracks.forEach((track, i) => expect(track.at(-1)!.digit).toBe(to[i]));
    // Changed tubes start later the further right they are.
    expect(tracks[2][1].at).toBeGreaterThan(tracks[1][1].at);
    for (const track of tracks) {
      for (let k = 1; k < track.length; k++) expect(track[k].at).toBeGreaterThanOrEqual(track[k - 1].at);
    }
  });

  it("cascade walks the full cathode stack on every tube", () => {
    const tracks = planNixieTransition(from, to, "cascade");
    for (const track of tracks) {
      expect(track.slice(1, -1).map((e) => e.digit)).toEqual([...CATHODE_STACK]);
    }
    expect(nixieDuration(tracks)).toBeGreaterThan(0);
  });

  it("instant and afterglow switch straight away", () => {
    for (const mode of ["instant", "afterglow"] as const) {
      const tracks = planNixieTransition(from, to, mode);
      expect(tracks.map((t) => t.length)).toEqual([1, 1, 1, 1]);
      expect(nixieDuration(tracks)).toBe(0);
    }
  });

  it("reads the lit cathode at any moment", () => {
    const track = [
      { at: 0, digit: 4 },
      { at: 50, digit: 7 },
      { at: 90, digit: 2 },
    ];
    expect(nixieDigitAt(track, 10)).toBe(4);
    expect(nixieDigitAt(track, 50)).toBe(7);
    expect(nixieDigitAt(track, 500)).toBe(2);
  });
});
