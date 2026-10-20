// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/_components/LoginForm";
import { ResetPasswordForm } from "@/app/reset-password/_components/ResetPasswordForm";
import { PasswordSection } from "@/app/settings/_components/PasswordSection";
import { SignupForm } from "@/app/signup/_components/SignupForm";

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("token=reset-token"),
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

afterEach(() => {
  cleanup();
});

async function expectReveal(name: string) {
  const user = userEvent.setup();
  const show = screen.getByRole("button", { name });
  expect(show).toHaveAttribute("aria-pressed", "false");
  await user.click(show);
  const hideName = name.replace(/^Show /, "Hide ");
  expect(screen.getByRole("button", { name: hideName })).toHaveAttribute("aria-pressed", "true");
}

describe("password visibility", () => {
  it("tells a screen reader when the sign-in password is showing", async () => {
    render(<LoginForm />);
    await expectReveal("Show password");
  });

  it("tells a screen reader when a new password is showing", async () => {
    render(<SignupForm />);
    await expectReveal("Show password");
    await expectReveal("Show confirmed password");
  });

  it("tells a screen reader when a reset password is showing", async () => {
    render(<ResetPasswordForm />);
    await expectReveal("Show password");
    await expectReveal("Show confirmed password");
  });

  it("tells a screen reader when a settings password is showing", async () => {
    render(<PasswordSection />);
    await expectReveal("Show current password");
    await expectReveal("Show new password");
    await expectReveal("Show confirmed password");
  });
});
