// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddLinkCard from "@/components/AddLinkCard";

vi.mock("thinking-orbs", () => ({
  ThinkingOrb: () => null,
}));

vi.mock("@/components/MorphText", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
});

describe("AddLinkCard focus", () => {
  it("points the URL field at a failure and keeps a focus ring", async () => {
    render(
      <AddLinkCard
        groupId="reading"
        onSaved={() => {}}
        saveLink={async () => ({ ok: false, error: "Could not save that link" })}
      />,
    );

    const opener = screen.getByRole("button", { name: "Add link" });
    expect(opener.className).toContain("focus-visible:ring-2");
    fireEvent.click(opener);

    const url = screen.getByRole("textbox", { name: "Link" });
    expect(url.className).toContain("focus-visible:ring-2");
    expect(url.className).not.toContain("focus:border-foreground");
    fireEvent.change(url, { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not save that link");
    expect(url).toHaveAttribute("aria-invalid", "true");
    expect(url).toHaveAttribute("aria-describedby", "add-link-url-error");
    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain(
      "focus-visible:ring-2",
    );
    expect(screen.getByRole("button", { name: "Save" }).className).toContain(
      "focus-visible:ring-2",
    );
  });
});
