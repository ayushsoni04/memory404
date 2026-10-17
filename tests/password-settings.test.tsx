// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PasswordSection } from "@/app/settings/_components/PasswordSection";
import { ProfileTab } from "@/app/settings/_components/ProfileTab";

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("password settings", () => {
  it("stays off the page until the profile has loaded", () => {
    render(
      <ProfileTab
        name=""
        setName={() => {}}
        username=""
        setUsername={() => {}}
        email=""
        bannerStyle="midnight"
        setBannerStyle={() => {}}
        avatarPreview={null}
        onAvatarChange={() => {}}
        isSaved={false}
        isLoading
        profileReady={false}
        onSaveProfile={() => {}}
        onOpenDeactivateModal={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "Update password" })).not.toBeInTheDocument();
  });

  it("does not call a half-typed confirmation a mismatch", () => {
    render(<PasswordSection />);
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "NewPassword2" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "NewPass" },
    });

    expect(screen.queryByText("Those new passwords do not match.")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "NewPassword3" },
    });
    expect(screen.getByText("Those new passwords do not match.")).toBeInTheDocument();
  });

  it("does not scold a password that is still short", () => {
    render(<PasswordSection />);
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "short" },
    });
    expect(screen.queryByText(/Password must include/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "password1" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/uppercase/i);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "Memory404" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "Memory404" },
    });
    expect(
      screen.getByText("Choose a different password than the one you use now."),
    ).toBeInTheDocument();
  });

  it("explains a weak password before sending it", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<PasswordSection />);

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText(/Password must include:/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server error and can reveal the current password", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Current password is incorrect" }),
      }),
    );
    render(<PasswordSection />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "WrongPassword1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "NewPassword2" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "NewPassword2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Show current password" }));
    expect(screen.getByLabelText("Current password")).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Current password is incorrect",
    );
    expect(screen.getByLabelText("Current password")).toHaveValue("WrongPassword1");
  });

  it("says to sign in again when the session is gone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      }),
    );
    render(<PasswordSection />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "OldPassword1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "NewPassword2" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "NewPassword2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again.",
    );
    expect(screen.getByLabelText("Current password")).toHaveValue("OldPassword1");
  });

  it("confirms a successful change and clears the fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<PasswordSection />);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "OldPassword1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "NewPassword2" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "NewPassword2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Password updated.");
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/me/password",
        expect.objectContaining({ method: "POST" }),
      );
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toEqual({
      currentPassword: "OldPassword1",
      newPassword: "NewPassword2",
    });
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
