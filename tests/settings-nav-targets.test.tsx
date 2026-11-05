// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsNav } from "@/app/settings/_components/SettingsNav";

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

vi.mock("@/components/GlitchText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
});

describe("settings navigation on a phone", () => {
  it("keeps the sections and Sign out at 44px", () => {
    render(<SettingsNav activeTab="profile" onTabChange={() => {}} />);

    for (const name of ["Profile", "Stats & activity"]) {
      const tab = screen.getByRole("tab", { name });
      expect(tab.className).toContain("h-11");
      expect(tab.className).toContain("sm:h-8");
    }

    const signOut = screen.getByRole("button", { name: "Sign out" });
    expect(signOut.className).toContain("h-11");
    expect(signOut.className).toContain("sm:h-9");
  });
});
