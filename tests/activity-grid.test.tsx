// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityGrid } from "@/app/settings/_components/ActivityGrid";
import { StatsTab } from "@/app/settings/_components/StatsTab";
import {
  activityDateKey,
  activityDayLabel,
  activityTimeZone,
  buildActivityCells,
  nextActivityCell,
} from "@/lib/activity-grid";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("activity calendar", () => {
  it("names a day by how many links were added", () => {
    expect(activityDayLabel("2026-10-14", 1)).toMatch(/^1 link added on /);
    expect(activityDayLabel("2026-10-14", 0)).toMatch(/^0 links added on /);
    expect(activityDayLabel("2026-10-14", 4)).toMatch(/^4 links added on /);
  });

  it("builds 26 weeks and keeps a saved day's count", () => {
    const cells = buildActivityCells(
      [{ date: "2026-10-14", count: 4 }],
      new Date(2026, 9, 14, 12),
    );
    expect(cells).toHaveLength(26 * 7);
    expect(cells.at(-1)?.date).toBe("2026-10-14");
    expect(cells.at(-1)?.count).toBe(4);
    expect(cells[0]?.count).toBe(0);
  });

  it("keeps an evening save on the local calendar day", () => {
    const evening = new Date(2026, 9, 14, 23, 30);
    expect(activityDateKey(evening)).toBe("2026-10-14");

    const iso = Date.prototype.toISOString;
    Date.prototype.toISOString = function toUtcEvening() {
      const shifted = new Date(this.getTime() + 8 * 60 * 60 * 1000);
      return iso.call(shifted);
    };
    try {
      const cells = buildActivityCells(
        [{ date: "2026-10-14", count: 3 }],
        evening,
      );
      expect(cells.at(-1)?.date).toBe("2026-10-14");
      expect(cells.at(-1)?.count).toBe(3);
    } finally {
      Date.prototype.toISOString = iso;
    }
  });

  it("accepts a real timezone and ignores a forged one", () => {
    expect(activityTimeZone("America/Los_Angeles")).toBe("America/Los_Angeles");
    expect(activityTimeZone("  UTC  ")).toBe("UTC");
    expect(activityTimeZone("Not/AZone")).toBe("UTC");
    expect(activityTimeZone("UTC'; drop")).toBe("UTC");
    expect(activityTimeZone(null)).toBe("UTC");
  });

  it("asks statistics for the viewer's timezone", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        totalLinks: 1,
        totalGroups: 1,
        linksByGroup: [{ id: "g1", name: "Reading", count: 1 }],
        linkFrequency: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<StatsTab bannerStyle="midnight" />);
    expect(await screen.findByText("Days you added links")).toBeInTheDocument();

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(new URL(url, "http://localhost").searchParams.get("tz")).toBe(
      activityTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone),
    );
  });

  it("moves by weekday inside a week and by week sideways", () => {
    expect(nextActivityCell(10, "ArrowDown", 182)).toBe(11);
    expect(nextActivityCell(13, "ArrowDown", 182)).toBeNull();
    expect(nextActivityCell(7, "ArrowUp", 182)).toBeNull();
    expect(nextActivityCell(10, "ArrowRight", 182)).toBe(17);
    expect(nextActivityCell(10, "ArrowLeft", 182)).toBe(3);
    expect(nextActivityCell(0, "ArrowLeft", 182)).toBeNull();
    expect(nextActivityCell(180, "ArrowRight", 182)).toBeNull();
    expect(nextActivityCell(4, "Home", 182)).toBe(0);
    expect(nextActivityCell(4, "End", 182)).toBe(181);
    expect(nextActivityCell(4, "Enter", 182)).toBeNull();
  });

  it("shows the selected day in text and moves it with the arrow keys", () => {
    const cells = buildActivityCells(
      [{ date: "2026-10-14", count: 4 }],
      new Date(2026, 9, 14, 12),
    );
    render(<ActivityGrid cells={cells} />);

    const today = screen.getByRole("button", { name: /4 links added on/ });
    expect(today).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("status")).toHaveTextContent(/4 links added on/);
    expect(today.className).toContain("focus-visible:ring-2");

    today.focus();
    fireEvent.keyDown(today, { key: "ArrowUp" });

    expect(today).not.toHaveFocus();
    expect(screen.getByRole("status").textContent).not.toMatch(/^4 links/);
    expect(screen.getAllByRole("button").filter((button) => button.tabIndex === 0)).toHaveLength(1);
  });
});