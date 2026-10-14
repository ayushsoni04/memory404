import { describe, expect, it } from "vitest";
import {
  nextSettingsTab,
  resolveSettingsTab,
  settingsHrefWithoutRetiredTab,
} from "@/app/settings/_components/constants";

describe("settings tabs", () => {
  it("sends retired membership URLs to Profile and keeps other params", () => {
    expect(resolveSettingsTab("membership")).toBe("profile");
    expect(resolveSettingsTab(null)).toBe("profile");
    expect(resolveSettingsTab("nope")).toBe("profile");
    expect(resolveSettingsTab("profile")).toBe("profile");
    expect(resolveSettingsTab("statistics")).toBe("statistics");
    expect(
      settingsHrefWithoutRetiredTab("membership", {
        tab: "membership",
        from: "email",
      }),
    ).toBe("/settings?from=email");
    expect(settingsHrefWithoutRetiredTab("membership", { tab: "membership" })).toBe(
      "/settings",
    );
    expect(settingsHrefWithoutRetiredTab("statistics", { tab: "statistics" })).toBe(
      null,
    );
  });

  it("moves between Profile and Stats with the arrow keys and stops at the ends", () => {
    expect(nextSettingsTab("profile", "ArrowDown")).toBe("statistics");
    expect(nextSettingsTab("profile", "ArrowRight")).toBe("statistics");
    expect(nextSettingsTab("statistics", "ArrowUp")).toBe("profile");
    expect(nextSettingsTab("statistics", "ArrowLeft")).toBe("profile");
    expect(nextSettingsTab("profile", "ArrowUp")).toBeNull();
    expect(nextSettingsTab("statistics", "ArrowDown")).toBeNull();
    expect(nextSettingsTab("statistics", "Home")).toBe("profile");
    expect(nextSettingsTab("profile", "End")).toBe("statistics");
    expect(nextSettingsTab("profile", "Home")).toBeNull();
    expect(nextSettingsTab("profile", "Enter")).toBeNull();
  });
});
