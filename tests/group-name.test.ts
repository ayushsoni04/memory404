import { describe, expect, it } from "vitest";
import {
  GROUP_NAME_IN_TRASH,
  GROUP_NAME_MAX,
  GROUP_NAME_RESERVED,
  GROUP_NAME_TAKEN,
  groupNameConflict,
  groupNameConflictMessage,
  groupNameDraftIssue,
  groupNameIssue,
} from "@/lib/group-name";

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

  it("rejects a name the library already uses for the inbox", () => {
    expect(groupNameIssue("All")).toBe(GROUP_NAME_RESERVED);
    expect(groupNameIssue("  general ")).toBe(GROUP_NAME_RESERVED);
    expect(groupNameIssue("Uncategorized")).toBe(GROUP_NAME_RESERVED);
    expect(groupNameIssue("All links")).toBeNull();
    expect(groupNameIssue("Reading")).toBeNull();
  });
});

describe("groupNameDraftIssue", () => {
  it("stays quiet until there is a name, then reports the same problems", () => {
    expect(groupNameDraftIssue("")).toBeNull();
    expect(groupNameDraftIssue("   ")).toBeNull();
    expect(groupNameDraftIssue("Reading")).toBeNull();
    expect(groupNameDraftIssue("R".repeat(GROUP_NAME_MAX + 1))).toMatch(/60/);
    expect(groupNameDraftIssue("Reading\nlist")).toMatch(/line breaks/);
  });
});

describe("groupNameConflict", () => {
  const reading = { name: "Reading", deletedAt: null };
  const trashed = { name: "Reading", deletedAt: "2026-10-01T00:00:00.000Z" };

  it("blocks a name that is already in the library, in any letter case", () => {
    expect(groupNameConflict("reading", [reading])).toBe("active");
    expect(groupNameConflictMessage("active")).toBe(GROUP_NAME_TAKEN);
  });

  it("points at Trash when the only match was deleted", () => {
    expect(groupNameConflict("Reading", [trashed])).toBe("trash");
    expect(groupNameConflict(" READING ", [trashed])).toBe("trash");
    expect(groupNameConflictMessage("trash")).toBe(GROUP_NAME_IN_TRASH);
  });

  it("prefers the library when both a live group and a trashed one match", () => {
    expect(groupNameConflict("Reading", [trashed, reading])).toBe("active");
  });

  it("allows a name nobody is using", () => {
    expect(groupNameConflict("Design", [reading, trashed])).toBeNull();
    expect(groupNameConflictMessage(null)).toBeNull();
  });
});
