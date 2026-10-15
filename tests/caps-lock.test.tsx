// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/_components/LoginForm";

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
});

function setCapsLock(on: boolean) {
  act(() => {
    const event = new KeyboardEvent("keyup", { key: "a", bubbles: true });
    Object.defineProperty(event, "getModifierState", {
      value: (key: string) => key === "CapsLock" && on,
    });
    window.dispatchEvent(event);
  });
}

describe("Caps Lock on a password field", () => {
  it("warns only while the password field is focused", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const password = screen.getByLabelText("Password");

    await user.click(password);
    expect(screen.queryByText("Caps Lock is on.")).not.toBeInTheDocument();

    setCapsLock(true);
    expect(screen.getByRole("status")).toHaveTextContent("Caps Lock is on.");

    await user.click(screen.getByLabelText("Email address"));
    expect(screen.queryByText("Caps Lock is on.")).not.toBeInTheDocument();

    await user.click(password);
    expect(screen.getByRole("status")).toHaveTextContent("Caps Lock is on.");

    setCapsLock(false);
    expect(screen.queryByText("Caps Lock is on.")).not.toBeInTheDocument();
  });
});
