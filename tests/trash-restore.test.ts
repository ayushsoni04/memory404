import { describe, expect, it } from "vitest";
import {
  GROUP_NOT_IN_TRASH,
  GROUP_RESTORE_TAKEN,
  LINK_ALREADY_SAVED,
  LINK_NOT_IN_TRASH,
  groupRestoreIssue,
  groupRestoreMessage,
  linkRestoreIssue,
} from "@/lib/trash-restore";

describe("link restore", () => {
  it("explains a missing link and one that is already in the library", () => {
    expect(linkRestoreIssue({ found: false, inTrash: false, urlTaken: false })).toEqual({
      status: 404,
      message: LINK_NOT_IN_TRASH,
    });
    expect(linkRestoreIssue({ found: true, inTrash: false, urlTaken: false })?.message).toBe(
      LINK_NOT_IN_TRASH,
    );
    expect(linkRestoreIssue({ found: true, inTrash: true, urlTaken: true })).toEqual({
      status: 409,
      message: LINK_ALREADY_SAVED,
    });
    expect(linkRestoreIssue({ found: true, inTrash: true, urlTaken: false })).toBeNull();
    expect(LINK_ALREADY_SAVED).toMatch(/This page is already in your library/);
  });
});

describe("group restore", () => {
  it("names the library group that already uses this name", () => {
    expect(groupRestoreIssue({ found: false, inTrash: false, activeName: null })).toEqual({
      status: 404,
      message: GROUP_NOT_IN_TRASH,
    });
    expect(
      groupRestoreIssue({ found: true, inTrash: true, activeName: "Reading" }),
    ).toEqual({
      status: 409,
      message: "“Reading” is already in your library. Rename that group, then restore this one.",
    });
    expect(groupRestoreMessage("  ")).toBe(GROUP_RESTORE_TAKEN);
    expect(groupRestoreIssue({ found: true, inTrash: true, activeName: null })).toBeNull();
  });
});
