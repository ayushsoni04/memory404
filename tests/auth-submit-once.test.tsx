// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/_components/LoginForm";
import { ResetPasswordForm } from "@/app/reset-password/_components/ResetPasswordForm";
import { SignupForm } from "@/app/signup/_components/SignupForm";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("token=reset-token"),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function hangThenFail(message: string) {
  let release: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {};
  let calls = 0;
  const fetchMock = vi.fn(() => {
    calls += 1;
    if (calls === 1) {
      return new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
        release = resolve;
      });
    }
    return Promise.resolve({
      ok: false,
      json: async () => ({ error: message }),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    fetchMock,
    finish() {
      release({ ok: false, json: async () => ({ error: message }) });
    },
  };
}

function submitTwice(name: string) {
  const button = screen.getByRole("button", { name });
  const form = button.closest("form");
  if (!form) throw new Error(`No form for ${name}`);
  fireEvent.submit(form);
  fireEvent.submit(form);
}

describe("auth forms submit once", () => {
  it("ignores a second sign-in until the first one finishes", async () => {
    const pending = hangThenFail("Invalid email or password");
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Memory404" },
    });

    submitTwice("Sign in");
    expect(pending.fetchMock).toHaveBeenCalledTimes(1);

    pending.finish();
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");

    submitTwice("Sign in");
    await waitFor(() => {
      expect(pending.fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it("ignores a second account creation until the first one finishes", async () => {
    const pending = hangThenFail("Failed to create account");
    render(<SignupForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Memory404" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Memory404" },
    });

    submitTwice("Create account");
    expect(pending.fetchMock).toHaveBeenCalledTimes(1);

    pending.finish();
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to create account");

    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);
    await waitFor(() => {
      expect(pending.fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it("ignores a second password reset until the first one finishes", async () => {
    const pending = hangThenFail("Failed to reset password");
    render(<ResetPasswordForm />);
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "Memory404" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "Memory404" },
    });

    submitTwice("Update password");
    expect(pending.fetchMock).toHaveBeenCalledTimes(1);

    pending.finish();
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to reset password");

    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);
    await waitFor(() => {
      expect(pending.fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
