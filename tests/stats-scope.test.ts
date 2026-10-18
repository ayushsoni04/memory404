import { describe, expect, it } from "vitest";
import { activeLibraryMatch, STATS_INTRO, trashedLibraryMatch } from "@/lib/stats-scope";
import { libraryStatsEmptyState } from "@/lib/stats-empty";

describe("activeLibraryMatch", () => {
  it("counts the library and leaves Trash out", () => {
    expect(activeLibraryMatch("user-1")).toEqual({
      userId: "user-1",
      deletedAt: null,
    });
    expect(trashedLibraryMatch("user-1")).toEqual({
      userId: "user-1",
      deletedAt: { $ne: null },
    });
  });

  it("treats a library that only has Trash as different from a new account", () => {
    expect(libraryStatsEmptyState(0, 0)?.title).toBe("No links yet");
    expect(libraryStatsEmptyState(0, 4)?.href).toBe("/trash");
    expect(libraryStatsEmptyState(2, 4)).toBeNull();
  });

  it("introduces Stats in the same words as an empty library", () => {
    expect(STATS_INTRO).toBe(
      "See how many links you have saved, which groups hold them, and the days you added them.",
    );
    expect(STATS_INTRO).not.toMatch(/density|timeline/i);
  });
});
