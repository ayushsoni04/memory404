import { describe, expect, it } from "vitest";
import {
  NOTE_MAX,
  NOTE_TOO_LONG,
  noteCountLabel,
  noteIssue,
} from "../extension/src/note-limit.js";

describe("extension note limit", () => {
  it("accepts a short note and a blank one", () => {
    expect(noteIssue("")).toBeNull();
    expect(noteIssue("  Remember the pricing section.  ")).toBeNull();
    expect(noteCountLabel("short")).toBeNull();
  });

  it("counts a note that is close to the limit", () => {
    expect(noteCountLabel("x".repeat(1_600))).toBe("1,600 of 2,000");
    expect(noteIssue("x".repeat(NOTE_MAX))).toBeNull();
  });

  it("rejects a note that would not fit", () => {
    const tooLong = "x".repeat(NOTE_MAX + 1);
    expect(noteIssue(tooLong)).toBe(NOTE_TOO_LONG);
    expect(noteCountLabel(tooLong)).toBe("2,001 of 2,000");
  });
});
