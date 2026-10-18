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
  window.history.replaceState(null, "", "/");
});

describe("settings tab address", () => {
  it("writes the open section into the address bar", async () => {
    window.history.replaceState(null, "", "/settings?from=email#extension");
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
            name: "Ada",
            username: "ada",
            avatarUrl: null,
            bannerStyle: "midnight",
          },
        }),
      }),
    );

    render(<SettingsClient isOwner={false} initialTab="profile" />);

    fireEvent.click(screen.getByRole("tab", { name: "Stats & activity" }));
    expect(window.location.pathname).toBe("/settings");
    expect(window.location.search).toBe("?from=email&tab=statistics");
    expect(window.location.hash).toBe("#extension");
    expect(screen.getByRole("tab", { name: "Stats & activity" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Profile" }));
    expect(window.location.search).toBe("?from=email");
    expect(window.location.hash).toBe("#extension");
  });
});
