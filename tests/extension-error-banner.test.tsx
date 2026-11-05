// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExtensionErrorBanner } from "@/components/ExtensionErrorBanner";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("error=Could%20not%20save%20that%20page"),
  usePathname: () => "/",
  useRouter: () => ({ replace }),
}));

afterEach(() => {
  cleanup();
  replace.mockClear();
});

describe("extension error banner", () => {
  it("focuses Dismiss and keeps it easy to tap", async () => {
    render(<ExtensionErrorBanner />);

    const dismiss = await screen.findByRole("button", { name: "Dismiss" });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save that page");
    await waitFor(() => expect(dismiss).toHaveFocus());
    expect(dismiss.className).toContain("min-h-11");
    expect(dismiss.className).toContain("sm:min-h-8");
    expect(dismiss.className).toContain("focus-visible:ring-2");
    expect(replace).toHaveBeenCalled();
  });
});
