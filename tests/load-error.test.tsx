// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatsTab } from "@/app/settings/_components/StatsTab";
import { asSentence, explainLoadError } from "@/lib/load-error";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("explainLoadError", () => {
  it("rewrites a dropped connection and leaves server messages alone", () => {
    expect(explainLoadError("Failed to fetch")).toMatch(/Couldn't reach memory404/);
    expect(explainLoadError("Load failed")).toMatch(/Check your connection/);
    expect(
      explainLoadError("NetworkError when attempting to fetch resource."),
    ).toMatch(/Check your connection/);
    expect(explainLoadError("Failed to load links")).toBe("Failed to load links");
    expect(explainLoadError("Failed to fetch links")).toBe("Failed to fetch links");
    expect(explainLoadError(null)).toBeNull();
  });

  it("tells someone to sign in again when the session is gone", () => {
    expect(explainLoadError("Unauthorized")).toBe(
      "Your session expired. Sign in again.",
    );
    expect(explainLoadError(" unauthorized ")).toBe(
      "Your session expired. Sign in again.",
    );
    expect(explainLoadError("Failed to load links")).toBe("Failed to load links");
  });

  it("does not add a second period", () => {
    expect(asSentence("Search failed")).toBe("Search failed.");
    expect(asSentence("Couldn't reach memory404. Check your connection and try again.")).toBe(
      "Couldn't reach memory404. Check your connection and try again.",
    );
  });
});

describe("statistics when the session is gone", () => {
  it("says to sign in again instead of Unauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ success: false, error: "Unauthorized" }),
      })),
    );

    render(<StatsTab bannerStyle="midnight" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again.",
    );
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
  });
});

describe("statistics when the network drops", () => {
  it("explains that memory404 could not be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    render(<StatsTab bannerStyle="midnight" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't reach memory404. Check your connection and try again.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("No links yet")).not.toBeInTheDocument();
  });
});
