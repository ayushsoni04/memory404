import { describe, expect, it } from "vitest";
import {
  commandPaletteJumpGroups,
  libraryGroupLabel,
  searchResultGroupLabel,
  withInboxInGroupSearch,
} from "@/lib/search-group";

const groups = [
  { id: "all", name: "All" },
  { id: "general", name: "General" },
  { id: "reading", name: "Reading" },
  { id: "blank", name: "  " },
];

describe("commandPaletteJumpGroups", () => {
  it("lists All once and leaves the stored General group out", () => {
    expect(
      commandPaletteJumpGroups([
        { id: "general", name: "General" },
        { id: "reading", name: "Reading" },
      ]).map((group) => group.name),
    ).toEqual(["All", "Reading"]);
  });

  it("does not duplicate All when the palette already has it", () => {
    expect(
      commandPaletteJumpGroups([
        { id: "all", name: "All" },
        { id: "general", name: " general " },
        { id: "reading", name: "Reading" },
      ]).map((group) => group.id),
    ).toEqual(["all", "reading"]);
  });
});

describe("withInboxInGroupSearch", () => {
  const reading = { id: "reading", name: "Reading" };

  it("offers All when the query is looking for the inbox", () => {
    expect(withInboxInGroupSearch([], "all").map((group) => group.name)).toEqual(["All"]);
    expect(withInboxInGroupSearch([], "  Al ").map((group) => group.id)).toEqual(["all"]);
    expect(
      withInboxInGroupSearch([{ id: "links", name: "All links" }], "all").map(
        (group) => group.name,
      ),
    ).toEqual(["All", "All links"]);
  });

  it("leaves All out of a search for another group", () => {
    expect(withInboxInGroupSearch([reading], "read").map((group) => group.id)).toEqual([
      "reading",
    ]);
    expect(withInboxInGroupSearch([reading], "")).toEqual([reading]);
  });
});

describe("libraryGroupLabel", () => {
  it("calls the stored inbox All and keeps other names", () => {
    expect(libraryGroupLabel("General")).toBe("All");
    expect(libraryGroupLabel(" uncategorized ")).toBe("All");
    expect(libraryGroupLabel("Reading")).toBe("Reading");
    expect(libraryGroupLabel("  ")).toBeNull();
    expect(libraryGroupLabel(null)).toBeNull();
  });
});

describe("searchResultGroupLabel", () => {
  it("names the group a search hit belongs to", () => {
    expect(searchResultGroupLabel("reading", groups)).toBe("Reading");
  });

  it("calls the inbox All, the same label the library uses", () => {
    expect(searchResultGroupLabel("general", groups)).toBe("All");
    expect(searchResultGroupLabel("inbox", [{ id: "inbox", name: "Uncategorized" }])).toBe(
      "All",
    );
  });

  it("stays quiet when the group is missing or unnamed", () => {
    expect(searchResultGroupLabel("missing", groups)).toBeNull();
    expect(searchResultGroupLabel("blank", groups)).toBeNull();
  });
});
