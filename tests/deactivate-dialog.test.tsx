// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeactivateModal } from "@/app/settings/_components/DeactivateModal";
import { isDeactivateConfirmation } from "@/lib/deactivate-confirm";

afterEach(() => {
  cleanup();
});

describe("isDeactivateConfirmation", () => {
  it("accepts the word in any letter case, with surrounding spaces", () => {
    expect(isDeactivateConfirmation("deactivate")).toBe(true);
    expect(isDeactivateConfirmation("Deactivate")).toBe(true);
    expect(isDeactivateConfirmation("  DEACTIVATE  ")).toBe(true);
    expect(isDeactivateConfirmation("deactivated")).toBe(false);
    expect(isDeactivateConfirmation("")).toBe(false);
  });
});

describe("DeactivateModal", () => {
  it("keeps Tab inside and closes from Escape or Cancel", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <>
        <button type="button">Delete account & data</button>
        <DeactivateModal
          open
          onClose={onClose}
          deactivateInput=""
          setDeactivateInput={() => {}}
          isDeactivating={false}
          deactivatedSuccess={false}
          onSubmit={onSubmit}
        />
      </>,
    );

    const dialog = screen.getByRole("dialog", { name: "Confirm Deactivation" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const input = screen.getByRole("textbox");
    expect(input).toHaveFocus();
    expect(input.className).toContain("focus-visible:ring-2");
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel.className).toContain("focus-visible:ring-2");

    const user = userEvent.setup();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "Delete account & data" })).not.toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(cancel);
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ignores Escape and the backdrop while the account is being deleted", () => {
    const onClose = vi.fn();
    render(
      <DeactivateModal
        open
        onClose={onClose}
        deactivateInput="deactivate"
        setDeactivateInput={() => {}}
        isDeactivating
        deactivatedSuccess={false}
        error="Failed to delete account"
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to delete account");
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(document.querySelector("[data-deactivate-backdrop]")!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes from the backdrop when nothing is in progress", () => {
    const onClose = vi.fn();
    render(
      <DeactivateModal
        open
        onClose={onClose}
        deactivateInput=""
        setDeactivateInput={() => {}}
        isDeactivating={false}
        deactivatedSuccess={false}
        onSubmit={() => {}}
      />,
    );

    fireEvent.click(document.querySelector("[data-deactivate-backdrop]")!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("enables the wipe button when the word is capitalized", () => {
    render(
      <DeactivateModal
        open
        onClose={() => {}}
        deactivateInput="Deactivate"
        setDeactivateInput={() => {}}
        isDeactivating={false}
        deactivatedSuccess={false}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Wipe everything" })).toBeEnabled();
  });
});
