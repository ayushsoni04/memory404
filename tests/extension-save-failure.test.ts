import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EXTENSION_SESSION_EXPIRED,
  EXTENSION_UNREACHABLE,
  explainSaveFailure,
} from "../extension/src/save-failure.js";

describe("explainSaveFailure", () => {
  it("explains a timeout and a dropped connection", () => {
    expect(explainSaveFailure("Request timed out after 12s")).toBe(EXTENSION_UNREACHABLE);
    expect(explainSaveFailure("Save timed out after 18s")).toBe(EXTENSION_UNREACHABLE);
    expect(explainSaveFailure("Failed to fetch")).toBe(EXTENSION_UNREACHABLE);
    expect(explainSaveFailure("TypeError: Failed to fetch")).toBe(EXTENSION_UNREACHABLE);
    expect(explainSaveFailure("NetworkError when attempting to fetch resource.")).toBe(
      EXTENSION_UNREACHABLE,
    );
    expect(explainSaveFailure("")).toBe(EXTENSION_UNREACHABLE);
  });

  it("leaves a message that already says what happened", () => {
    expect(explainSaveFailure("Session expired — sign in again")).toBe(
      EXTENSION_SESSION_EXPIRED,
    );
    expect(explainSaveFailure(EXTENSION_SESSION_EXPIRED)).toBe(EXTENSION_SESSION_EXPIRED);
    expect(explainSaveFailure("Sign in to memory404 to save links")).toMatch(/sign in/i);
    expect(explainSaveFailure("A group with this name already exists.")).toMatch(
      /already exists/,
    );
    expect(explainSaveFailure("Failed to load groups")).toBe("Failed to load groups");
  });

  it("is what the save worker says when a request dies", () => {
    const worker = readFileSync("extension/public/static/background.js", "utf8");
    const build = readFileSync("extension/webpack.config.js", "utf8");
    expect(worker).toContain("explainSaveFailure");
    expect(worker).toContain("Your session expired. Sign in again.");
    expect(worker).not.toContain("Session expired —");
    expect(build).toContain("save-failure.js");
    expect(readFileSync("extension/public/static/manifest.json", "utf8")).toContain(
      '"version": "0.2.22"',
    );
  });
});
