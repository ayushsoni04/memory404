// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "@/app/forgot-password/page";
import { EMAIL_INVALID } from "@/lib/auth-email";
import { AUTH_OFFLINE_MESSAGE } from "@/lib/auth-form-error";

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
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

vi.mock("@/components/auth/AuthShell", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("forgot password", () => {
  it("lets you correct the email after the confirmation", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) })),
    );

    render(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "If an account exists for ada@example.com",
    );

    await user.click(screen.getByRole("button", { name: "Use a different email" }));
    const email = screen.getByLabelText("Email address");
    expect(email).toHaveValue("ada@example.com");
    await user.clear(email);
    await user.type(email, "ada.lovelace@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "ada.lovelace@example.com",
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects an incomplete email before saying a reset is on the way", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "user@localhost");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(screen.getByRole("alert")).toHaveTextContent(EMAIL_INVALID);
    expect(screen.getByLabelText("Email address")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email address")).toHaveFocus();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call a dropped connection an invalid email", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Failed to fetch");
      }),
    );

    render(<ForgotPasswordPage />);
    const email = screen.getByLabelText("Email address");
    await user.type(email, "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_OFFLINE_MESSAGE);
    expect(email).toHaveFocus();
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(email).toHaveAttribute("aria-describedby", "forgot-form-error");
    expect(email).not.toHaveAttribute("aria-describedby", "forgot-email-error");
  });

  it("returns to the email when the server cannot send a link", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Failed to send reset link" }),
      })),
    );

    render(<ForgotPasswordPage />);
    const email = screen.getByLabelText("Email address");
    await user.type(email, "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to send reset link");
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-describedby", "forgot-form-error");
  });

  it("sends one reset request when the button is clicked twice", async () => {
    let release: (value: unknown) => void = () => {};
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ForgotPasswordPage />);
    const email = screen.getByLabelText("Email address");
    fireEvent.change(email, { target: { value: "ada@example.com" } });
    const form = email.closest("form");
    if (!form) throw new Error("Email field is not in a form");
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fetchMock).toHaveBeenCalledOnce();
    release({ ok: true, json: async () => ({ ok: true }) });
    expect(await screen.findByRole("status")).toHaveTextContent("ada@example.com");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("confirms the address without extra spaces", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) })),
    );

    render(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "  Ada@Example.com  ");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "If an account exists for ada@example.com",
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/forgot-password",
      expect.objectContaining({
        body: JSON.stringify({ email: "ada@example.com" }),
      }),
    );
  });
});
