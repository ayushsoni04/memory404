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

describe("settings without billing", () => {
  it("opens Profile for a retired membership tab and never lists Plan & billing", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "",
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            id: "user-1",
            email: "ada@example.com",
            name: "Ada Lovelace",
            username: "ada",
            avatarUrl: null,
            bannerStyle: "midnight",
            plan: "pro",
          },
        }),
      }),
    );

    render(<SettingsClient isOwner={false} initialTab="profile" />);

    expect(screen.queryByRole("button", { name: "Plan & billing" })).not.toBeInTheDocument();
    expect(screen.queryByText(/membership/i)).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Profile settings" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Stats & activity" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tabpanel", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" }).className).toContain(
      "focus-visible:ring-2",
    );
  });

  it("moves from Profile to Stats with the arrow keys", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            id: "user-1",
            email: "ada@example.com",
            name: "Ada",
            username: "ada",
            avatarUrl: null,
            bannerStyle: "midnight",
          },
        }),
      }),
    );

    render(<SettingsClient isOwner={false} initialTab="profile" />);

    const profile = screen.getByRole("tab", { name: "Profile" });
    const stats = screen.getByRole("tab", { name: "Stats & activity" });
    expect(profile).toHaveAttribute("tabindex", "0");
    expect(stats).toHaveAttribute("tabindex", "-1");
    profile.focus();
    fireEvent.keyDown(profile, { key: "ArrowDown" });
    expect(stats).toHaveFocus();
    expect(stats).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Stats & activity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Usage statistics" })).toBeInTheDocument();
  });
});
