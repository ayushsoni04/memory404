import { describe, expect, it, vi } from "vitest";
import { joinInflight } from "@/lib/join-inflight";

describe("joinInflight", () => {
  it("runs one request when the same save is started twice", async () => {
    const inflight = new Map<string, Promise<string>>();
    let started = 0;
    let release: (value: string) => void = () => {};
    const gate = new Promise<string>((resolve) => {
      release = resolve;
    });
    const start = vi.fn(() => {
      started += 1;
      return gate;
    });

    const first = joinInflight(inflight, "https://example.com/docs", start);
    const second = joinInflight(inflight, "https://example.com/docs", start);
    expect(started).toBe(1);
    expect(second).toBe(first);

    release("saved");
    await expect(first).resolves.toBe("saved");
    await expect(second).resolves.toBe("saved");
    expect(inflight.size).toBe(0);

    const again = joinInflight(inflight, "https://example.com/docs", async () => "next");
    await expect(again).resolves.toBe("next");
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("keeps a different page on its own request, and clears a failure", async () => {
    const inflight = new Map<string, Promise<string>>();
    const other = joinInflight(inflight, "https://other.test", async () => "other");
    await expect(
      joinInflight(inflight, "https://example.com", async () => {
        throw new Error("offline");
      }),
    ).rejects.toThrow("offline");
    await expect(other).resolves.toBe("other");
    expect(inflight.size).toBe(0);

    const retry = joinInflight(inflight, "https://example.com", async () => "ok");
    await expect(retry).resolves.toBe("ok");
  });
});
