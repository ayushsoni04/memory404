import { describe, expect, it } from "vitest";
import { GROUP_NAME_MAX, groupNameIssue } from "@/lib/group-name";

describe("groupNameIssue", () => {
  it("accepts a normal collection name", () => {
    expect(groupNameIssue("Reading")).toBeNull();
    expect(groupNameIssue("  Design references  ")).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(groupNameIssue("   ")).toBe("Group name cannot be empty");
  });

  it("rejects a name that will not fit on a pill", () => {
    const long = "R".repeat(GROUP_NAME_MAX + 1);
    expect(groupNameIssue(long)).toBe(
      `Group names must be ${GROUP_NAME_MAX} characters or fewer.`,
    );
    expect(groupNameIssue("R".repeat(GROUP_NAME_MAX))).toBeNull();
  });

  it("rejects a line break pasted into the name", () => {
    expect(groupNameIssue("Reading\nlist")).toBe(
      "Group names can't include line breaks.",
    );
  });
});
