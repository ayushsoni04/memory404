// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/_components/LoginForm";
import { AUTH_OFFLINE_MESSAGE } from "@/lib/auth-form-error";

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
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
  vi.unstubAllGlobals();
});

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email address"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "Memory404");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm failed sign-in", () => {
  it("ties the failure to the password field and clears it when that field changes", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Invalid email or password" }),
      })),
    );

    render(<LoginForm />);
    await signIn(user);

    const password = screen.getByLabelText("Password");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid email or password");
    expect(alert).toHaveAttribute("id", "login-password-error");
    expect(password).toHaveFocus();
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAttribute("aria-describedby", "login-password-error");

    await user.type(password, "1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(password).not.toHaveAttribute("aria-invalid");
    expect(password).not.toHaveAttribute("aria-describedby");
  });

  it("returns focus to the password when the request never arrives", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    render(<LoginForm />);
    await signIn(user);

    const password = screen.getByLabelText("Password");
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_OFFLINE_MESSAGE);
    expect(password).toHaveFocus();
    expect(password).toHaveAttribute("aria-describedby", "login-password-error");
  });
});
