import { describe, expect, it } from "vitest";
import { UNREACHABLE_MESSAGE } from "@/lib/load-error";
import {
  NOTE_SAVE_FAILED,
  SAVE_FAILED,
  noteSaveFailureMessage,
  saveFailureMessage,
} from "@/lib/save-failure";

describe("saveFailureMessage", () => {
  it("uses the connection sentence when the request never arrives", () => {
    expect(saveFailureMessage(null, true)).toBe(UNREACHABLE_MESSAGE);
    expect(noteSaveFailureMessage(null, true)).toBe(UNREACHABLE_MESSAGE);
  });

  it("rewrites a bare failure and keeps a reason the server already wrote", () => {
    expect(saveFailureMessage({})).toBe(SAVE_FAILED);
    expect(saveFailureMessage({ error: "Failed to save link" })).toBe(SAVE_FAILED);
    expect(saveFailureMessage({ error: "Unauthorized" })).toMatch(/session expired/i);
    expect(saveFailureMessage({ error: "That group is in Trash." })).toBe(
      "That group is in Trash.",
    );
  });

  it("explains a dead session on a note without replacing a real note error", () => {
    expect(noteSaveFailureMessage({})).toBe(NOTE_SAVE_FAILED);
    expect(noteSaveFailureMessage({ error: "Unauthorized" })).toMatch(/session expired/i);
    expect(noteSaveFailureMessage({ error: "Could not save the note" })).toBe(
      "Could not save the note",
    );
  });
});
