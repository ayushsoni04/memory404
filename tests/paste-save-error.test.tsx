// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAddLinkFlow } from "@/components/vault/useAddLinkFlow";
import type { GroupRow } from "@/components/vault/types";
import type { LinkApiRow } from "@/lib/links";

afterEach(() => {
  vi.clearAllMocks();
});

const generalGroup: GroupRow = {
  id: "general",
  name: "General",
  createdAt: "2026-10-01T00:00:00.000Z",
  linksCount: 0,
  previewTitles: [],
};

function pasteUrl(url: string) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    configurable: true,
    value: { getData: () => url },
  });
  document.body.dispatchEvent(event);
}

function renderFlow(
  openedGroupId: string,
  saveLink: ReturnType<typeof vi.fn>,
) {
  return renderHook(() => {
    const [links, setLinks] = useState<LinkApiRow[]>([]);
    const flow = useAddLinkFlow({
      openedGroupId,
      generalGroup,
      links,
      setLinks,
      setLinksCache: vi.fn(),
      prependLinkToPages: vi.fn(),
      loadGroups: vi.fn(async () => undefined),
      loadLinks: vi.fn(async () => undefined),
      saveLink: saveLink as never,
    });
    return { ...flow, links };
  });
}

describe("useAddLinkFlow save failures", () => {
  it("keeps a pasted URL on screen when saving into the open group fails", async () => {
    const saveLink = vi.fn().mockResolvedValue({
      ok: false,
      error: "Could not save this link",
    });
    const { result } = renderFlow("group-1", saveLink);

    await act(async () => {
      pasteUrl("https://example.com/pricing");
    });

    expect(saveLink).toHaveBeenCalledWith("https://example.com/pricing", "group-1");
    expect(result.current.saveError).toBe("Could not save this link");
    expect(result.current.savePhase).toBe("place");
    expect(result.current.urlInput).toBe("https://example.com/pricing");
    expect(result.current.saving).toBe(false);
    expect(result.current.links).toEqual([]);
  });

  it("explains a network failure and removes the placeholder card", async () => {
    const saveLink = vi.fn().mockRejectedValue(new Error("offline"));
    const { result } = renderFlow("all", saveLink);

    await act(async () => {
      pasteUrl("https://example.com/notes");
    });
    expect(result.current.savePhase).toBe("place");

    act(() => {
      result.current.setPlaceGroupId("general");
    });
    await act(async () => {
      await result.current.handleSubmit({
        preventDefault() {},
      } as never);
    });

    expect(result.current.saveError).toMatch(/Couldn't reach memory404/);
    expect(result.current.urlInput).toBe("https://example.com/notes");
    expect(result.current.saving).toBe(false);
    expect(result.current.links).toEqual([]);
  });
});
