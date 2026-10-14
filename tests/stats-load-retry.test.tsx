// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatsTab } from "@/app/settings/_components/StatsTab";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("statistics load", () => {
  it("offers Retry instead of showing an empty library", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Could not load statistics" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          totalLinks: 12,
          totalGroups: 3,
          linksByGroup: [{ id: "g1", name: "Reading", count: 12 }],
          linkFrequency: [],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<StatsTab bannerStyle="midnight" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load statistics",
    );
    expect(
      screen.getByText("Your saved links are still in the library."),
    ).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText("No categories created yet.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
