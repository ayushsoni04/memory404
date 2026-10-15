import { describe, expect, it } from "vitest";
import { searchResultGroupLabel } from "@/lib/search-group";

const groups = [
  { id: "all", name: "All" },
  { id: "general", name: "General" },
  { id: "reading", name: "Reading" },
  { id: "blank", name: "  " },
];

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
