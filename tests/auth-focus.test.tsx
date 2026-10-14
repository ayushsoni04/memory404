// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/_components/LoginForm";
import { SignupForm } from "@/app/signup/_components/SignupForm";
import ForgotPasswordPage from "@/app/forgot-password/page";
import { ResetPasswordForm } from "@/app/reset-password/_components/ResetPasswordForm";

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

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=reset-token"),
  useRouter: () => ({ push: vi.fn() }),
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

function expectFocusRing(element: HTMLElement) {
  expect(element.className).toContain("focus-visible:ring-2");
}

describe("auth focus rings", () => {
  it("rings the sign-in field, reveal control, submit, and links", () => {
    render(<LoginForm />);
    expectFocusRing(screen.getByLabelText("Email address"));
    expectFocusRing(screen.getByLabelText("Password"));
    const reveal = screen.getByRole("button", { name: "Show password" });
    expectFocusRing(reveal);
    expect(reveal.className).toContain("size-8");
    expectFocusRing(screen.getByRole("button", { name: "Sign in" }));
    expectFocusRing(screen.getByRole("link", { name: "Forgot password?" }));
    expectFocusRing(screen.getByRole("link", { name: "Sign up" }));
  });

  it("rings sign-up fields, including the optional select", () => {
    render(<SignupForm />);
    expectFocusRing(screen.getByLabelText("Email address"));
    expectFocusRing(screen.getByLabelText("Password"));
    expectFocusRing(screen.getByLabelText(/How did you hear about us/));
    expectFocusRing(screen.getByRole("button", { name: "Create account" }));
    expectFocusRing(screen.getByRole("link", { name: "Download the Chrome extension" }));
  });

  it("rings the reset-link field and the new-password field", () => {
    const { unmount } = render(<ForgotPasswordPage />);
    expectFocusRing(screen.getByLabelText("Email address"));
    expectFocusRing(screen.getByRole("button", { name: "Send reset link" }));
    expectFocusRing(screen.getByRole("link", { name: "Back to sign in" }));
    unmount();

    render(<ResetPasswordForm />);
    expectFocusRing(screen.getByLabelText("New password"));
    expectFocusRing(screen.getByRole("button", { name: "Show password" }));
    expectFocusRing(screen.getByRole("button", { name: "Update password" }));
  });
});
