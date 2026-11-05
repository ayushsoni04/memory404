// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotFound from "@/app/not-found";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/auth/AuthDitherBackground", () => ({
  default: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("missing page", () => {
  it("offers a keyboard-visible way back to the library", () => {
    render(<NotFound />);
    const home = screen.getByRole("link", { name: "Return to your links" });
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toContainElement(home);
    expect(home).toHaveAttribute("href", "/");
    expect(home.className).toContain("min-h-11");
    expect(home.className).toContain("focus-visible:ring-2");
  });
});
