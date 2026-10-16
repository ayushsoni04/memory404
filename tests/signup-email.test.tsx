// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/app/signup/_components/SignupForm";
import { EMAIL_INVALID, emailIssue, normalizeEmail } from "@/lib/auth-email";

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

describe("emailIssue", () => {
  it("accepts a normal address and rejects one the browser would allow", () => {
    expect(emailIssue("  Ada@Example.com ")).toBeNull();
    expect(normalizeEmail("  Ada@Example.com ")).toBe("ada@example.com");
    expect(emailIssue("user@localhost")).toBe(EMAIL_INVALID);
    expect(emailIssue("not-an-email")).toBe(EMAIL_INVALID);
    expect(emailIssue("")).toBe(EMAIL_INVALID);
  });
});

describe("SignupForm email", () => {
  it("explains an invalid email before sending it", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SignupForm />);
    await user.type(screen.getByLabelText("Email address"), "user@localhost");
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await user.type(screen.getByLabelText("Confirm password"), "Memory404");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent(EMAIL_INVALID);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the address without surrounding spaces", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ user: { id: "1" } }),
      })),
    );
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });

    render(<SignupForm />);
    await user.type(screen.getByLabelText("Email address"), "  Ada@Example.com  ");
    await user.type(screen.getByLabelText("Password"), "Memory404");
    await user.type(screen.getByLabelText("Confirm password"), "Memory404");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({
        body: expect.stringContaining('"email":"ada@example.com"'),
      }),
    );
  });
});
