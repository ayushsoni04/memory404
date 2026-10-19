// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { useState, type FormEvent } from "react";
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

function savedLink(groupId: string): LinkApiRow {
  return {
    id: "link-1",
    url: "https://example.com/pricing",
    title: "Pricing",
    customTitle: null,
    displayTitle: "Pricing",
    description: null,
    imageUrl: "",
    faviconUrl: "",
    tags: [],
    notes: null,
    groupId,
    metadataStatus: "ready",
    createdAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  };
}

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

describe("sidebar save runs once", () => {
  it("ignores a second paste while the open group is still saving", async () => {
    let release: (value: { ok: true; link: LinkApiRow }) => void = () => {};
    const saveLink = vi.fn(
      () =>
        new Promise<{ ok: true; link: LinkApiRow }>((resolve) => {
          release = resolve;
        }),
    );
    renderFlow("reading", saveLink);

    await act(async () => {
      pasteUrl("https://example.com/pricing");
      pasteUrl("https://example.com/pricing");
    });

    expect(saveLink).toHaveBeenCalledOnce();
    expect(saveLink).toHaveBeenCalledWith("https://example.com/pricing", "reading");

    await act(async () => {
      release({ ok: true, link: savedLink("reading") });
    });
  });

  it("ignores a second Save on the group step until the first one finishes", async () => {
    let release: (value: { ok: true; link: LinkApiRow }) => void = () => {};
    const saveLink = vi.fn(
      () =>
        new Promise<{ ok: true; link: LinkApiRow }>((resolve) => {
          release = resolve;
        }),
    );
    const { result } = renderFlow("all", saveLink);

    await act(async () => {
      pasteUrl("https://example.com/pricing");
    });
    expect(saveLink).not.toHaveBeenCalled();
    expect(result.current.savePhase).toBe("place");

    const submit = result.current.handleSubmit;
    await act(async () => {
      void submit({ preventDefault() {} } as FormEvent);
      void submit({ preventDefault() {} } as FormEvent);
    });

    expect(saveLink).toHaveBeenCalledOnce();
    expect(saveLink).toHaveBeenCalledWith("https://example.com/pricing", "general", {
      newGroupName: undefined,
    });

    await act(async () => {
      release({ ok: true, link: savedLink("general") });
    });
  });

  it("lets the group step save again after the first attempt fails", async () => {
    const saveLink = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "Could not save this link" })
      .mockResolvedValueOnce({ ok: true, link: savedLink("general") });
    const { result } = renderFlow("all", saveLink);

    await act(async () => {
      pasteUrl("https://example.com/pricing");
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as FormEvent);
    });
    expect(result.current.saveError).toBe("Could not save this link");
    expect(result.current.saving).toBe(false);

    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as FormEvent);
    });
    expect(saveLink).toHaveBeenCalledTimes(2);
    expect(result.current.saving).toBe(true);
  });
});
