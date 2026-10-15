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

function renderFlow(openedGroupId: string, saveLink: ReturnType<typeof vi.fn>) {
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
    return flow;
  });
}

describe("pasting a link without a scheme", () => {
  it("fills the field with https when the library is showing every group", async () => {
    const saveLink = vi.fn();
    const { result } = renderFlow("all", saveLink);

    await act(async () => {
      pasteUrl("linear.app/docs");
    });

    expect(saveLink).not.toHaveBeenCalled();
    expect(result.current.urlInput).toBe("https://linear.app/docs");
    expect(result.current.savePhase).toBe("place");
  });

  it("saves the https URL into the open group", async () => {
    const saveLink = vi.fn().mockResolvedValue({
      ok: false,
      error: "stopped",
    });
    const { result } = renderFlow("group-1", saveLink);

    await act(async () => {
      pasteUrl("linear.app/docs");
    });

    expect(saveLink).toHaveBeenCalledWith("https://linear.app/docs", "group-1");
    expect(result.current.urlInput).toBe("https://linear.app/docs");
  });

  it("ignores a sentence on the clipboard", async () => {
    const saveLink = vi.fn();
    const { result } = renderFlow("all", saveLink);

    await act(async () => {
      pasteUrl("remember this later");
    });

    expect(result.current.urlInput).toBe("");
    expect(saveLink).not.toHaveBeenCalled();
  });
});
