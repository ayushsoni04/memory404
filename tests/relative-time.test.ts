import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/links";

const now = Date.parse("2026-10-16T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("keeps a timestamp a few seconds ahead as just now", () => {
    expect(formatRelativeTime("2026-10-16T12:00:05.000Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-10-16T11:59:55.000Z", now)).toBe("just now");
  });

  it("does not call a future save just now", () => {
    const future = "2026-10-16T13:00:00.000Z";
    expect(formatRelativeTime(future, now)).toBe(
      new Date(future).toLocaleDateString(),
    );
    expect(formatRelativeTime(future, now)).not.toBe("just now");
  });

  it("still counts elapsed time from the past", () => {
    expect(formatRelativeTime("2026-10-16T11:59:20.000Z", now)).toBe("40s ago");
    expect(formatRelativeTime("2026-10-16T11:00:00.000Z", now)).toBe("1h ago");
    expect(formatRelativeTime("2026-10-14T12:00:00.000Z", now)).toBe("2d ago");
  });

  it("stays quiet when the timestamp cannot be read", () => {
    expect(formatRelativeTime("not-a-date", now)).toBe("");
  });
});
