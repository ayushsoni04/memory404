// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
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

describe("settings on a laptop", () => {
  it("scrolls the open section instead of clipping it", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "",
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });

    render(<SettingsClient isOwner={false} initialTab="profile" />);

    const panel = screen.getByRole("tabpanel", { name: "Profile" });
    const column = panel.parentElement;
    expect(column?.tagName).toBe("MAIN");
    expect(column?.className).toContain("min-h-0");
    expect(column?.className).toContain("lg:overflow-y-auto");
    expect(panel).toHaveTextContent("Profile settings");
  });
});
