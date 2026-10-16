// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "@/app/reset-password/_components/ResetPasswordForm";
import { resetPasswordErrors } from "@/lib/reset-password";

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const navigation = vi.hoisted(() => ({
  token: "",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.token ? `token=${navigation.token}` : ""),
}));

afterEach(() => {
  cleanup();
  navigation.token = "";
  vi.unstubAllGlobals();
});

describe("resetPasswordErrors", () => {
  it("asks for a confirmation that matches", () => {
    expect(resetPasswordErrors("Memory404", "")).toEqual({
      confirm: "Confirm your new password.",
    });
    expect(resetPasswordErrors("Memory404", "Memory405")).toEqual({
      confirm: "Those new passwords do not match.",
    });
    expect(resetPasswordErrors("Memory404", "Memory404")).toEqual({});
    expect(resetPasswordErrors("short", "short").password).toMatch(/uppercase/i);
  });
});

describe("ResetPasswordForm", () => {
  it("explains a missing token before asking for a password", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ResetPasswordForm />);

    expect(screen.getByRole("heading", { name: "Reset link expired" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This reset link is invalid or expired.",
    );
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not send a password that was typed differently the second time", async () => {
    navigation.token = "reset-token";
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ResetPasswordForm />);
    await user.type(screen.getByLabelText("New password"), "Memory404");
    await user.type(screen.getByLabelText("Confirm new password"), "Memory405");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Those new passwords do not match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the new password once the confirmation matches", async () => {
    navigation.token = "reset-token";
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) })),
    );

    render(<ResetPasswordForm />);
    await user.type(screen.getByLabelText("New password"), "Memory404");
    await user.type(screen.getByLabelText("Confirm new password"), "Memory404");
    await user.click(screen.getByRole("button", { name: "Show confirmed password" }));
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText(/Password updated/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/reset-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "reset-token", password: "Memory404" }),
      }),
    );
  });
});
