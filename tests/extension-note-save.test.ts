import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { claimNoteSave, releaseNoteSave } from "../extension/src/note-save.js";

describe("extension note save", () => {
  it("ignores a second claim until the first note save is released", () => {
    const lock = { current: false };
    expect(claimNoteSave(lock)).toBe(true);
    expect(claimNoteSave(lock)).toBe(false);
    expect(lock.current).toBe(true);

    releaseNoteSave(lock);
    expect(lock.current).toBe(false);
    expect(claimNoteSave(lock)).toBe(true);
  });

  it("claims the note save before the message is sent", () => {
    const overlay = readFileSync("extension/src/overlay.jsx", "utf8");
    const claimAt = overlay.indexOf("claimNoteSave(noteSaveLock)");
    const sendAt = overlay.indexOf('type: "SAVE_LINK_NOTE"');
    expect(claimAt).toBeGreaterThan(-1);
    expect(sendAt).toBeGreaterThan(claimAt);
    expect(overlay).toContain("releaseNoteSave(noteSaveLock)");
    expect(readFileSync("extension/public/static/manifest.json", "utf8")).toContain(
      '"version": "0.2.24"',
    );
  });
});
