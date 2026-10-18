// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

function loadedProfile() {
  return {
    ok: true,
    json: async () => ({ user: profile }),
  };
}

describe("settings actions after the session expires", () => {
  it("explains a failed profile save", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(loadedProfile())
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: "Unauthorized" }),
        }),
    );
    installMatchMedia();

    render(<SettingsClient isOwner={false} />);
    expect(await screen.findByDisplayValue("Ada Lovelace")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save profile changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again.",
    );
    expect(screen.getByDisplayValue("Ada Lovelace")).toBeInTheDocument();
  });

  it("explains a failed account deletion", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(loadedProfile())
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: "Unauthorized" }),
        }),
    );
    installMatchMedia();

    render(<SettingsClient isOwner={false} />);
    expect(await screen.findByDisplayValue("Ada Lovelace")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete account & data" }));
    fireEvent.change(screen.getByPlaceholderText("deactivate"), {
      target: { value: "deactivate" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again.",
    );
    expect(screen.getByRole("dialog", { name: "Delete account" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("deactivate")).toHaveValue("deactivate");
  });

  it("explains when the profile save never reaches the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(loadedProfile())
        .mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );
    installMatchMedia();

    render(<SettingsClient isOwner={false} />);
    expect(await screen.findByDisplayValue("Ada Lovelace")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save profile changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't reach memory404. Check your connection and try again.",
    );
  });
});
