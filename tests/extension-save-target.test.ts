import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overlay = readFileSync("extension/src/overlay.jsx", "utf8");

describe("extension save target", () => {
  it("says which pages will be saved", () => {
    expect(overlay).toContain('aria-label="What to save"');
    expect(overlay).toContain('aria-pressed={saveMode === "active"}');
    expect(overlay).toContain('aria-pressed={saveMode === "selected"}');
    expect(overlay).toContain('aria-pressed={saveMode === "group"}');
  });

  it("returns to the note and marks it invalid when the note cannot be saved", () => {
    const failure = overlay.indexOf(
      'setNoteError(res?.error || "Could not save the note")',
    );
    const focus = overlay.indexOf("noteRef.current?.focus()", failure);
    expect(failure).toBeGreaterThan(-1);
    expect(focus).toBeGreaterThan(failure);
    expect(overlay).toContain(
      "aria-invalid={noteProblem || noteError ? true : undefined}",
    );
    expect(readFileSync("extension/dist/manifest.json", "utf8")).toContain(
      '"version": "0.2.32"',
    );
  });
});
