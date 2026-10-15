import { describe, expect, it } from "vitest";
import {
  nextBannerStyle,
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

  it("moves through profile banners and stops at the ends", () => {
    expect(nextBannerStyle("midnight", "ArrowRight")).toBe("aurora");
    expect(nextBannerStyle("aurora", "ArrowDown")).toBe("twilight");
    expect(nextBannerStyle("ocean", "ArrowLeft")).toBe("twilight");
    expect(nextBannerStyle("twilight", "ArrowUp")).toBe("aurora");
    expect(nextBannerStyle("midnight", "ArrowLeft")).toBeNull();
    expect(nextBannerStyle("ocean", "ArrowRight")).toBeNull();
    expect(nextBannerStyle("aurora", "Home")).toBe("midnight");
    expect(nextBannerStyle("aurora", "End")).toBe("ocean");
    expect(nextBannerStyle("midnight", "Home")).toBeNull();
    expect(nextBannerStyle("custom", "ArrowRight")).toBeNull();
  });
});
