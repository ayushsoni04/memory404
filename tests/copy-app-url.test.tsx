// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExtensionInstallCard } from "@/components/ExtensionInstallCard";
import { copyTextToClipboard } from "@/components/vault/link-utils";

vi.mock("@/components/vault/link-utils", () => ({
  copyTextToClipboard: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App URL copy", () => {
  it("says when the address could not be copied", async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValueOnce(false);

    render(<ExtensionInstallCard />);
    expect(await screen.findByText(window.location.origin)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy App URL" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't copy. Select the address and copy it yourself.");
    expect(screen.getByRole("button", { name: "Copy App URL" })).toHaveAttribute(
      "aria-describedby",
      "app-url-copy-error",
    );
    expect(copyTextToClipboard).toHaveBeenCalledWith(window.location.origin);
  });

  it("confirms when the address is copied", async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValueOnce(true);

    render(<ExtensionInstallCard />);
    expect(await screen.findByText(window.location.origin)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy App URL" }));

    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
