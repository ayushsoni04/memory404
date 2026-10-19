// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrashPage from "@/app/trash/page";

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Trash tap targets", () => {
  it("gives the header controls a 44px target on a phone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              type: "link",
              id: "link-1",
              url: "https://example.com/pricing",
              title: "Pricing",
              displayTitle: "Pricing",
              imageUrl: "/placeholder-unicorn.jpg",
              faviconUrl: "/placeholder-unicorn.jpg",
              groupId: "group-1",
              groupName: "Reading",
              deletedAt: new Date().toISOString(),
              daysLeft: 12,
            },
          ],
        }),
      }),
    );

    render(<TrashPage />);

    const back = await screen.findByRole("link", { name: "Back to vault" });
    expect(back.className).toContain("size-11");
    expect(back.className).toContain("sm:size-8");

    const empty = screen.getByRole("button", { name: "Empty Trash" });
    expect(empty.className).toContain("min-h-11");
    expect(empty.className).toContain("sm:min-h-8");
  });
});
