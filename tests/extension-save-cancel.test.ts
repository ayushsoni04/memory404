import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cancelledSaveJob,
  phaseForSaveStatus,
  saveLoopShouldStop,
} from "../extension/src/save-cancel.js";

describe("extension save cancel", () => {
  it("stops the batch once this job is no longer the active one", () => {
    expect(saveLoopShouldStop("job-1", "job-1")).toBe(false);
    expect(saveLoopShouldStop(null, "job-1")).toBe(true);
    expect(saveLoopShouldStop("job-2", "job-1")).toBe(true);
  });

  it("treats cancel as a return to the picker, not an error", () => {
    expect(cancelledSaveJob({ id: "job-1", status: "saving", error: null }, 50)).toEqual({
      id: "job-1",
      status: "cancelled",
      error: null,
      updatedAt: 50,
    });
    expect(phaseForSaveStatus("cancelled")).toBe("pick");
    expect(phaseForSaveStatus("saving")).toBe("saving");
    expect(phaseForSaveStatus("error")).toBe("error");
  });

  it("checks the worker loop and does not store Save cancelled as a failure", () => {
    const source = readFileSync(
      new URL("../extension/public/static/background.js", import.meta.url),
      "utf8",
    );
    expect(source).toContain("saveLoopShouldStop(activeRunnerId, job.id)");
    expect(source).toContain("cancelledSaveJob(job)");
    expect(source).not.toContain('error: "Save cancelled"');
  });
});
