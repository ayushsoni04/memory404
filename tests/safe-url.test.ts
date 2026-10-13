import { lookup } from "node:dns/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicImage, isPublicHttpUrlForFetch } from "@/lib/safe-url";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(lookup).mockReset();
  vi.mocked(lookup).mockResolvedValue([
    { address: "93.184.216.34", family: 4 },
  ] as never);
});

describe("isPublicHttpUrlForFetch", () => {
  it("allows public https urls", () => {
    expect(isPublicHttpUrlForFetch("https://example.com/path")).toBe(true);
  });

  it("blocks localhost, private networks, and cloud metadata", () => {
    expect(isPublicHttpUrlForFetch("http://localhost/admin")).toBe(false);
    expect(isPublicHttpUrlForFetch("http://127.0.0.1:4000")).toBe(false);
    expect(isPublicHttpUrlForFetch("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isPublicHttpUrlForFetch("http://10.0.0.5/")).toBe(false);
    expect(isPublicHttpUrlForFetch("http://192.168.1.1/")).toBe(false);
    expect(isPublicHttpUrlForFetch("http://metadata.google.internal/")).toBe(false);
    expect(isPublicHttpUrlForFetch("http://app.local/")).toBe(false);
    expect(isPublicHttpUrlForFetch("file:///etc/passwd")).toBe(false);
    expect(isPublicHttpUrlForFetch("http://user:pass@example.com/")).toBe(false);
  });
});

describe("fetchPublicImage", () => {
  it("does not fetch blocked urls", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPublicImage("http://127.0.0.1/secret.png");
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops when a redirect points at a private address", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPublicImage("http://1.1.1.1/preview.png");
    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects non-image responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }),
    );
    const result = await fetchPublicImage("http://1.1.1.1/page");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(415);
  });

  it("returns image bytes for a public image response", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(bytes, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }),
    );
    const result = await fetchPublicImage("http://1.1.1.1/pic.png");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contentType).toBe("image/png");
      expect(Array.from(result.bytes)).toEqual([1, 2, 3, 4]);
    }
  });

  it("rejects hostnames that resolve to loopback", async () => {
    vi.mocked(lookup).mockResolvedValue([
      { address: "127.0.0.1", family: 4 },
    ] as never);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPublicImage("https://example.com/pic.png");
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
