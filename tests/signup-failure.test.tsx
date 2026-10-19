// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/app/signup/_components/SignupForm";
import { EMAIL_INVALID } from "@/lib/auth-email";
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

async function fillAccount(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
  confirm = password,
) {
  await user.type(screen.getByLabelText("Email address"), email);
  await user.type(screen.getByLabelText("Password"), password);
  if (confirm) await user.type(screen.getByLabelText("Confirm password"), confirm);
}

describe("SignupForm after a failed attempt", () => {
  it("focuses the first invalid field", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SignupForm />);
    await fillAccount(user, "user@localhost", "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const email = screen.getByRole("textbox", { name: /Email address/ });
    expect(email).toHaveFocus();
    expect(screen.getByText(EMAIL_INVALID)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.clear(email);
    await user.type(email, "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByLabelText("Password")).toHaveFocus();

    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await user.clear(screen.getByLabelText("Confirm password"));
    await user.type(screen.getByLabelText("Confirm password"), "Memory405");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByLabelText("Confirm password")).toHaveFocus();
    expect(screen.getByText("Those passwords do not match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears a stale server error when the email or a password changes", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "An account with this email already exists" }),
      })),
    );

    render(<SignupForm />);
    await fillAccount(user, "ada@example.com", "Memory404");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account with this email already exists",
    );

    const serverError = "An account with this email already exists";
    const email = screen.getByLabelText("Email address");
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "signup-form-error");
    await user.type(email, "x");
    expect(screen.queryByText(serverError)).not.toBeInTheDocument();
    await user.keyboard("{Backspace}");

    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(serverError)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Password"), "1");
    expect(screen.queryByText(serverError)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Confirm password"), "1");

    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(serverError)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox"), "friend_colleague");
    expect(screen.getByText(serverError)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Confirm password"), "2");
    expect(screen.queryByText(serverError)).not.toBeInTheDocument();
  });

  it("does not mark the email wrong when the request never reaches memory404", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    render(<SignupForm />);
    await fillAccount(user, "ada@example.com", "Memory404");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_OFFLINE_MESSAGE);
    const email = screen.getByLabelText("Email address");
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(email).not.toHaveAttribute("aria-describedby");
  });
});
