// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SettingsClient from "@/app/settings/SettingsClient";

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const profile = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  username: "ada",
  avatarUrl: null,
  bannerStyle: "midnight",
  plan: "free",
};

describe("profile load", () => {
  it("keeps the form closed and retries without saving blank fields", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to load profile" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: profile }),
      });
    vi.stubGlobal("fetch", fetchMock);
    installMatchMedia();

    render(<SettingsClient isOwner={false} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load profile",
    );
    expect(
      screen.getByText("Your name and username were not changed."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save profile changes" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByDisplayValue("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save profile changes" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every((call) => call[1]?.method !== "PATCH")).toBe(
      true,
    );
  });
});
