import { describe, expect, it, vi } from "vitest";
import {
  collectLibraryLinks,
  libraryBackupFilename,
  libraryBackupPayload,
  libraryExportError,
  LIBRARY_BACKUP_SUMMARY,
  LIBRARY_BACKUP_TOO_LARGE,
  LIBRARY_EXPORT_FAILED,
} from "@/lib/library-backup";

describe("library backup", () => {
  it("keeps walking pages until the library ends", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        links: [{ id: "a" }],
        hasMore: true,
        nextCursor: "cursor-1",
      })
      .mockResolvedValueOnce({
        links: [{ id: "b" }],
        hasMore: false,
        nextCursor: null,
      });

    await expect(collectLibraryLinks(fetchPage)).resolves.toEqual({
      links: [{ id: "a" }, { id: "b" }],
      truncated: false,
    });
    expect(fetchPage).toHaveBeenNthCalledWith(1, null);
    expect(fetchPage).toHaveBeenNthCalledWith(2, "cursor-1");
  });

  it("stops instead of pretending a partial library is complete", async () => {
    const fetchPage = vi.fn(async () => ({
      links: [{ id: "a" }],
      hasMore: true,
      nextCursor: "more",
    }));

    const result = await collectLibraryLinks(fetchPage, 2);
    expect(result.truncated).toBe(true);
    expect(result.links).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(LIBRARY_BACKUP_TOO_LARGE).toMatch(/too large/i);
  });

  it("says the download leaves Trash out", () => {
    expect(LIBRARY_BACKUP_SUMMARY).toMatch(/Trash is not included/);
    expect(LIBRARY_BACKUP_SUMMARY).not.toMatch(/every saved link/);
  });

  it("explains a dead session and a dropped connection", () => {
    expect(libraryExportError("Unauthorized")).toMatch(/session expired/i);
    expect(libraryExportError("Failed to fetch")).toMatch(/connection/i);
    expect(libraryExportError("Failed to fetch links")).toBe(LIBRARY_EXPORT_FAILED);
    expect(libraryExportError("")).toBe(LIBRARY_EXPORT_FAILED);
  });

  it("names the file for the day and includes the groups", () => {
    const now = new Date("2026-10-16T15:04:00.000Z");
    expect(libraryBackupFilename(now, "UTC")).toBe("memory404-backup-2026-10-16.json");
    expect(libraryBackupFilename(new Date("2026-10-18T06:30:00.000Z"), "America/Los_Angeles")).toBe(
      "memory404-backup-2026-10-17.json",
    );
    expect(libraryBackupFilename(now)).toBe(
      `memory404-backup-${new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now)}.json`,
    );
    expect(
      libraryBackupPayload([{ id: "g1", name: "Reading" }], [{ id: "link-1" }], now),
    ).toEqual({
      exportedAt: "2026-10-16T15:04:00.000Z",
      groups: [{ id: "g1", name: "Reading" }],
      links: [{ id: "link-1" }],
    });
  });
});
