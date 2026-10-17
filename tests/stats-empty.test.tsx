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

  it("points at Trash when every saved link is there", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          totalLinks: 0,
          trashedLinks: 3,
          totalGroups: 1,
          linksByGroup: [],
          linkFrequency: [],
        }),
      }),
    );

    render(<StatsTab bannerStyle="midnight" />);

    expect(await screen.findByText("Your links are in Trash")).toBeInTheDocument();
    expect(screen.getByText(/Restore a link/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Trash" })).toHaveAttribute(
      "href",
      "/trash",
    );
    expect(screen.queryByText("No links yet")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
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
    expect(screen.getByText("Still in your library. Trash is not counted.")).toBeInTheDocument();
    expect(screen.getByText("Groups you can open. Trash is not counted.")).toBeInTheDocument();
    expect(screen.queryByText(/workspace categories/)).not.toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("Link addition activity")).toBeInTheDocument();
    expect(screen.queryByText("No links yet")).not.toBeInTheDocument();
  });

  it("calls the inbox All in the density list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          totalLinks: 3,
          totalGroups: 2,
          linksByGroup: [
            { id: "general", name: "General", count: 2 },
            { id: "reading", name: "Reading", count: 1 },
          ],
          linkFrequency: [],
        }),
      }),
    );

    render(<StatsTab bannerStyle="midnight" />);

    expect(await screen.findByText("All")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.queryByText("General")).not.toBeInTheDocument();
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
