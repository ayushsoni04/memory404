import { describe, expect, it } from "vitest";
import { activeLibraryMatch } from "@/lib/stats-scope";

describe("activeLibraryMatch", () => {
  it("counts the library and leaves Trash out", () => {
    expect(activeLibraryMatch("user-1")).toEqual({
      userId: "user-1",
      deletedAt: null,
    });
  });
});
