// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DeactivateModal } from "@/app/settings/_components/DeactivateModal";

afterEach(() => {
  cleanup();
});

describe("delete confirmation on a phone", () => {
  it("keeps the confirmation field at 16px", () => {
    render(
      <DeactivateModal
        open
        onClose={() => {}}
        deactivateInput=""
        setDeactivateInput={() => {}}
        isDeactivating={false}
        deactivatedSuccess={false}
        onSubmit={(event) => event.preventDefault()}
      />,
    );

    const field = screen.getByRole("textbox");
    expect(field.className).toContain("text-base");
    expect(field.className).toContain("sm:text-xs");
    expect(field).toHaveFocus();
  });
});
