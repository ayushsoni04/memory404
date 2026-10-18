// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/app/signup/_components/SignupForm";
import { signupPasswordErrors } from "@/lib/signup-password";

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

describe("signupPasswordErrors", () => {
  it("asks for a confirmation that matches", () => {
    expect(signupPasswordErrors("Memory404", "")).toEqual({
      confirm: "Confirm your password.",
    });
    expect(signupPasswordErrors("Memory404", "Memory405")).toEqual({
      confirm: "Those passwords do not match.",
    });
    expect(signupPasswordErrors("Memory404", "Memory404")).toEqual({});
    expect(signupPasswordErrors("short", "short").password).toMatch(/uppercase/i);
  });
});

describe("SignupForm", () => {
  it("stays quiet while the password is still short", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.type(screen.getByLabelText("Password"), "Mem");

    expect(screen.queryByText(/Password must include/)).not.toBeInTheDocument();
    expect(screen.getByText(/At least 8 characters/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "password1");
    expect(screen.getByRole("alert")).toHaveTextContent(/uppercase/i);
  });

  it("waits to say the passwords differ until the confirmation leaves the password", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await user.type(screen.getByLabelText("Confirm password"), "Memor");

    expect(screen.queryByText("Those passwords do not match.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).not.toHaveAttribute("aria-invalid");

    await user.type(screen.getByLabelText("Confirm password"), "y405");
    expect(screen.getByText("Those passwords do not match.")).toBeInTheDocument();
  });

  it("does not send a password that was typed differently the second time", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SignupForm />);
    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await user.type(screen.getByLabelText("Confirm password"), "Memory405");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Those passwords do not match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks for the password again when the confirmation is empty", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SignupForm />);
    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Confirm your password.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the password once the confirmation matches", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ user: { id: "1" } }),
      })),
    );
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });

    render(<SignupForm />);
    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await user.type(screen.getByLabelText("Confirm password"), "Memory404");
    await user.click(screen.getByRole("button", { name: "Show confirmed password" }));
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"password":"Memory404"'),
      }),
    );
  });

  it("warns about Caps Lock on the password field that is focused", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    const setCapsLock = (on: boolean) => {
      act(() => {
        const event = new KeyboardEvent("keyup", { key: "a", bubbles: true });
        Object.defineProperty(event, "getModifierState", {
          value: (key: string) => key === "CapsLock" && on,
        });
        window.dispatchEvent(event);
      });
    };

    await user.click(screen.getByLabelText("Password"));
    setCapsLock(true);
    expect(screen.getByRole("status")).toHaveTextContent("Caps Lock is on.");

    await user.click(screen.getByLabelText("Confirm password"));
    expect(screen.getByRole("status")).toHaveTextContent("Caps Lock is on.");

    await user.click(screen.getByLabelText("Email address"));
    expect(screen.queryByText("Caps Lock is on.")).not.toBeInTheDocument();
  });
});
