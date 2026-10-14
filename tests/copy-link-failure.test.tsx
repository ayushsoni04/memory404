// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MindCardActions from "@/components/vault/MindCardActions";
import { copyTextToClipboard } from "@/components/vault/link-utils";
import { playUiSound } from "@/lib/ui-sound";

vi.mock("@/components/vault/link-utils", () => ({
  copyTextToClipboard: vi.fn(),
}));

vi.mock("@/lib/ui-sound", () => ({
  playUiSound: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("copy link", () => {
  it("says when the clipboard rejects the link", async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValueOnce(false);

    render(<MindCardActions url="https://example.com/a" host="example.com" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy link: example.com" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Couldn't copy");
    expect(screen.getByRole("button", { name: "Couldn't copy the link" })).toBeInTheDocument();
    expect(playUiSound).toHaveBeenCalledWith("error");
    expect(playUiSound).not.toHaveBeenCalledWith("success");
  });

  it("confirms a successful copy", async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValueOnce(true);

    render(<MindCardActions url="https://example.com/a" host="example.com" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy link: example.com" }));

    expect(await screen.findByRole("button", { name: "Link copied" })).toBeInTheDocument();
    expect(screen.getByText("Copied")).toBeInTheDocument();
    expect(playUiSound).toHaveBeenCalledWith("success");
  });
});
