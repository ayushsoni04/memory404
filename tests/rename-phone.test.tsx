// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import LinkTitleEditor from "@/components/vault/LinkTitleEditor";
import type { LinkApiRow } from "@/lib/links";

afterEach(() => {
  cleanup();
});

function sample(): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com/article",
    title: "Pricing page",
    customTitle: null,
    displayTitle: "Pricing page",
    description: null,
    imageUrl: "",
    faviconUrl: "",
    tags: [],
    notes: null,
    groupId: "references",
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

describe("rename on a phone", () => {
  it("keeps Rename, the name field, Save, and Cancel easy to use", async () => {
    const user = userEvent.setup();
    render(<LinkTitleEditor link={sample()} />);

    const rename = screen.getByRole("button", { name: "Rename" });
    expect(rename.className).toContain("min-h-11");
    expect(rename.className).toContain("sm:min-h-8");

    await user.click(rename);
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(name.className).toContain("text-base");
    expect(name.className).toContain("sm:text-sm");

    for (const label of ["Save name", "Cancel"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button.className).toContain("h-11");
      expect(button.className).toContain("sm:h-8");
    }
  });
});
