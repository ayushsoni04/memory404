import { describe, expect, it } from "vitest";
import {
  commandPaletteJumpGroups,
  searchResultGroupLabel,
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
