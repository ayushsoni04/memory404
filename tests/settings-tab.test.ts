import { describe, expect, it } from "vitest";
import {
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
});
