// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/_components/LoginForm";
import { EMAIL_INVALID } from "@/lib/auth-email";

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

describe("LoginForm email", () => {
  it("explains an invalid email before asking the server", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email address"), "user@localhost");
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const emailField = screen.getByLabelText("Email address");
    expect(screen.getByRole("alert")).toHaveTextContent(EMAIL_INVALID);
    expect(emailField).toHaveFocus();
    expect(emailField).toHaveAttribute("aria-invalid", "true");
    expect(emailField).toHaveAttribute("aria-describedby", "login-email-error");
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(emailField, "m");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(emailField).not.toHaveAttribute("aria-invalid");
  });

  it("sends the address without surrounding spaces", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ user: { id: "1" } }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });

    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email address"), "  Ada@Example.com  ");
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "ada@example.com", password: "Memory404" }),
      }),
    );
  });
});
