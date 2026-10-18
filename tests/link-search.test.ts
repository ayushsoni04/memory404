import { describe, expect, it } from "vitest";
import { linkSearchPattern, linkTextSearchWhere } from "@/lib/link-search";

function matches(query: string, value: string): boolean {
  return new RegExp(linkSearchPattern(query), "i").test(value);
}

describe("link search separators", () => {
  it("keeps a query with no separator as literal text", () => {
    expect(linkSearchPattern("docs.*")).toBe("docs\\.\\*");
    expect(matches("docs.*", "Read the docs.* guide")).toBe(true);
    expect(matches("docs.*", "Read the docs guide")).toBe(false);
    expect(linkTextSearchWhere("")).toEqual({});
  });

  it("treats a hyphen, slash, underscore, or space as the same gap", () => {
    expect(linkSearchPattern("side-projects")).toBe("side[-_/\\s]+projects");
    expect(matches("side-projects", "Side Projects")).toBe(true);
    expect(matches("side projects", "side_projects")).toBe(true);
    expect(matches("side/projects", "side-projects")).toBe(true);
    expect(matches("side-projects", "sideprojects")).toBe(false);
    expect(matches("figma.com/file", "https://figma.com/file/abc")).toBe(true);
  });

  it("still escapes characters that would change the search", () => {
    expect(matches("docs.*(v2)", "notes about docs.*(v2)")).toBe(true);
    expect(matches("docs.*(v2)", "docsX(v2)")).toBe(false);
    expect(matches("docs.* (v2)", "docs.*-(v2)")).toBe(true);
    expect(matches("docs.* (v2)", "docsX (v2)")).toBe(false);
    const filter = linkTextSearchWhere("side-projects");
    expect(filter).toEqual({
      $or: [
        { title: { $regex: "side[-_/\\s]+projects", $options: "i" } },
        { customTitle: { $regex: "side[-_/\\s]+projects", $options: "i" } },
        { description: { $regex: "side[-_/\\s]+projects", $options: "i" } },
        { url: { $regex: "side[-_/\\s]+projects", $options: "i" } },
        { notes: { $regex: "side[-_/\\s]+projects", $options: "i" } },
        { tags: { $regex: "side[-_/\\s]+projects", $options: "i" } },
      ],
    });
  });
});
