import { describe, expect, it } from "vitest";
import { groupsMatchingQuery, normalizeGroupQuery } from "@/lib/group-query";

const groups = [
  { id: "1", name: "Side Projects" },
  { id: "2", name: "Reading" },
];

describe("group search", () => {
  it("ignores hyphens, slashes, and extra spaces", () => {
    expect(normalizeGroupQuery("  Side-Projects  ")).toBe("side projects");
    expect(groupsMatchingQuery(groups, "side-projects").map((g) => g.id)).toEqual([
      "1",
    ]);
    expect(groupsMatchingQuery(groups, "side/projects").map((g) => g.id)).toEqual([
      "1",
    ]);
    expect(groupsMatchingQuery(groups, "side   projects").map((g) => g.id)).toEqual([
      "1",
    ]);
  });

  it("returns every group when the query is blank", () => {
    expect(groupsMatchingQuery(groups, "   ")).toEqual(groups);
  });

  it("does not match a different name", () => {
    expect(groupsMatchingQuery(groups, "archive")).toEqual([]);
  });
});
