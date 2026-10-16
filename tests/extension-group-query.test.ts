import { describe, expect, it } from "vitest";
import {
  groupNameMatches,
  groupNamesMatchExactly,
  normalizeGroupQuery,
} from "../extension/src/group-query.js";

describe("extension group search", () => {
  it("folds hyphens, slashes, and extra spaces", () => {
    expect(normalizeGroupQuery("  Side-Projects  ")).toBe("side projects");
    expect(groupNameMatches("Side Projects", "side-projects")).toBe(true);
    expect(groupNameMatches("Side Projects", "side/projects")).toBe(true);
    expect(groupNameMatches("Side Projects", "side   projects")).toBe(true);
    expect(groupNameMatches("Archive", "side-projects")).toBe(false);
  });

  it("treats a hyphenated query as the existing group, not a new name", () => {
    expect(groupNamesMatchExactly("Side Projects", "side-projects")).toBe(true);
    expect(groupNamesMatchExactly("Side Projects", "side projects")).toBe(true);
    expect(groupNamesMatchExactly("Side Projects", "archive")).toBe(false);
    expect(groupNamesMatchExactly("Side Projects", "   ")).toBe(false);
  });

  it("still lists every group when the query is blank", () => {
    expect(groupNameMatches("Side Projects", "   ")).toBe(true);
  });
});
