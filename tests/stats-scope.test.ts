import { describe, expect, it } from "vitest";
import { activeLibraryMatch, trashedLibraryMatch } from "@/lib/stats-scope";
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
});
