// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "@/app/forgot-password/page";
import { LoginForm } from "@/app/login/_components/LoginForm";
import { SignupForm } from "@/app/signup/_components/SignupForm";
import { withAuthRedirect } from "@/lib/auth-redirect";

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/auth/AuthDitherBackground", () => ({
  default: () => null,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("redirect=/trash"),
}));

beforeEach(() => {
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
});

afterEach(() => {
  cleanup();
});

describe("withAuthRedirect", () => {
  it("keeps a safe destination and drops an off-site one", () => {
    expect(withAuthRedirect("/signup", "/settings")).toBe(
      "/signup?redirect=%2Fsettings",
    );
    expect(withAuthRedirect("/login", "/")).toBe("/login");
    expect(withAuthRedirect("/forgot-password", "//evil.example")).toBe(
      "/forgot-password",
    );
    expect(withAuthRedirect("/login", null)).toBe("/login");
  });
});

describe("auth screens", () => {
  it("carries the destination from sign-in to sign-up and reset", () => {
    const { unmount } = render(<LoginForm />);
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/signup?redirect=%2Ftrash",
    );
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/forgot-password?redirect=%2Ftrash",
    );
    unmount();

    render(<SignupForm />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Ftrash",
    );
  });

  it("carries the destination back from the reset-link screen", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Ftrash",
    );
  });
});
