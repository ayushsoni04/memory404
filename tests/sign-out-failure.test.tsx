// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsNav, SIGN_OUT_FAILED } from "@/app/settings/_components/SettingsNav";
import { UNREACHABLE_MESSAGE } from "@/lib/load-error";

const push = vi.fn();
const refresh = vi.fn();

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/components/GlitchText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
  push.mockReset();
  refresh.mockReset();
  vi.unstubAllGlobals();
});

function renderNav() {
  render(<SettingsNav activeTab="profile" onTabChange={() => {}} />);
}

describe("sign out", () => {
  it("ignores a second sign out until the first one finishes", async () => {
    let release: (value: { ok: boolean }) => void = () => {};
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          release = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderNav();
    const button = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledOnce();
    release({ ok: true });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });

  it("returns to Sign out and ties the failure to that button", async () => {
    let rejectFetch: (error: Error) => void = () => {};
    vi.stubGlobal(
      "fetch",
      () =>
        new Promise((_resolve, reject) => {
          rejectFetch = reject;
        }),
    );

    renderNav();
    const button = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(button);
    button.blur();
    rejectFetch(new TypeError("Failed to fetch"));

    expect(await screen.findByRole("alert")).toHaveTextContent(UNREACHABLE_MESSAGE);
    await waitFor(() => expect(button).toHaveFocus());
    expect(button).toHaveAttribute("aria-describedby", "sign-out-error");
    expect(button).toBeEnabled();
  });

  it("stays on settings when memory404 cannot be reached", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    renderNav();
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(UNREACHABLE_MESSAGE);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

  it("stays on settings when sign out is refused", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );

    renderNav();
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(SIGN_OUT_FAILED);
    expect(push).not.toHaveBeenCalled();
  });

  it("opens the sign-in screen after a successful sign out", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) })),
    );

    renderNav();
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
