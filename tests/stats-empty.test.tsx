// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatsTab } from "@/app/settings/_components/StatsTab";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("empty statistics", () => {
  it("explains an empty library instead of showing zeros", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          totalLinks: 0,
          totalGroups: 0,
          linksByGroup: [],
          linkFrequency: [],
        }),
      }),
    );

    render(<StatsTab bannerStyle="midnight" />);

    expect(await screen.findByText("No links yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Save a link in the library/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to your library" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText("No groups yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("Link addition activity")).not.toBeInTheDocument();
  });

  it("keeps the counters when the library has links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          totalLinks: 4,
          totalGroups: 1,
          linksByGroup: [{ id: "g1", name: "Reading", count: 4 }],
          linkFrequency: [{ date: "2026-10-14", count: 4 }],
        }),
      }),
    );

    render(<StatsTab bannerStyle="midnight" />);

    expect(await screen.findByText("4")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("Link addition activity")).toBeInTheDocument();
    expect(screen.queryByText("No links yet")).not.toBeInTheDocument();
  });

  it("says groups, not categories, when density is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          totalLinks: 2,
          totalGroups: 0,
          linksByGroup: [],
          linkFrequency: [],
        }),
      }),
    );

    render(<StatsTab bannerStyle="midnight" />);

    expect(await screen.findByText("No groups yet.")).toBeInTheDocument();
    expect(screen.queryByText("No categories created yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("No links yet")).not.toBeInTheDocument();
  });
});
