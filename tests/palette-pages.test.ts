import { describe, expect, it } from "vitest";
import { matchingPalettePages, palettePagesForUser } from "@/lib/palette-pages";

describe("matchingPalettePages", () => {
  const member = palettePagesForUser(false);
  const owner = palettePagesForUser(true);

  it("lists Settings and Trash, and Workspace only for the owner", () => {
    expect(member.map((page) => page.label)).toEqual(["Settings", "Trash"]);
    expect(owner.map((page) => page.label)).toEqual([
      "Workspace",
      "Settings",
      "Trash",
    ]);
  });

  it("keeps every page when the palette is empty", () => {
    expect(matchingPalettePages("  ", member)).toEqual(member);
  });

  it("keeps only pages whose name contains the query", () => {
    expect(matchingPalettePages("TRASH", owner).map((page) => page.id)).toEqual([
      "trash",
    ]);
    expect(matchingPalettePages("set", owner).map((page) => page.href)).toEqual([
      "/settings",
    ]);
  });

  it("hides every page when the query is a link or a title", () => {
    expect(matchingPalettePages("linear.app", owner)).toEqual([]);
    expect(matchingPalettePages("zzzz", member)).toEqual([]);
  });
});
