// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/_components/LoginForm";
import { SignupForm } from "@/app/signup/_components/SignupForm";
import ForgotPasswordPage from "@/app/forgot-password/page";
import { ResetPasswordForm } from "@/app/reset-password/_components/ResetPasswordForm";
import { AUTH_OFFLINE_MESSAGE } from "@/lib/auth-form-error";

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

const search = new URLSearchParams("token=reset-token");

vi.mock("next/navigation", () => ({
  useSearchParams: () => search,
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function expectOffline(buttonName: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: buttonName }));
  expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_OFFLINE_MESSAGE);
  expect(screen.getByRole("button", { name: buttonName })).toBeEnabled();
}

describe("auth forms when the request never returns", () => {
  it("keeps sign-in usable", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email address"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await expectOffline("Sign in");
  });

  it("keeps sign-up usable", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.type(screen.getByLabelText("Email address"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await expectOffline("Create account");
  });

  it("keeps the reset-link form usable", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "person@example.com");
    await expectOffline("Send reset link");
  });

  it("keeps the new-password form usable", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    await user.type(screen.getByLabelText("New password"), "Memory404");
    await user.type(screen.getByLabelText("Confirm new password"), "Memory404");
    await expectOffline("Update password");
  });
});
