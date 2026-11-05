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

function expectPhoneControl(element: HTMLElement) {
  expect(element.className).toContain("h-11");
  expect(element.className).toContain("sm:h-7");
}

describe("add link on a phone", () => {
  it("keeps the link field at 16px and Save and Cancel at 44px", () => {
    render(
      <AddLinkCard
        groupId="reading"
        onSaved={() => {}}
        saveLink={async () => ({ ok: false, error: "unused" })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    const link = screen.getByRole("textbox", { name: "Link" });
    expect(link.className).toContain("text-base");
    expect(link.className).toContain("sm:text-[13px]");
    expectPhoneControl(screen.getByRole("button", { name: "Save" }));
    expectPhoneControl(screen.getByRole("button", { name: "Cancel" }));
  });

  it("keeps the note field at 16px and its save action at 44px", async () => {
    render(
      <AddLinkCard
        groupId="reading"
        onSaved={() => {}}
        saveLink={async () => ({
          ok: true,
          link: {
            id: "link-1",
            url: "https://example.com",
            title: "Example",
            customTitle: null,
            displayTitle: "Example",
            description: null,
            imageUrl: "",
            faviconUrl: "",
            tags: [],
            notes: null,
            groupId: "reading",
            metadataStatus: "ready",
            createdAt: "2026-10-01T12:00:00.000Z",
            deletedAt: null,
          },
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const note = await screen.findByRole("textbox", { name: "Add a note" });
    expect(note.className).toContain("text-base");
    expect(note.className).toContain("sm:text-[13px]");
    expectPhoneControl(screen.getByRole("button", { name: "Done" }));
  });
});
