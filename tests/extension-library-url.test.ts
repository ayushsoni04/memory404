import { describe, expect, it } from "vitest";
import { libraryHomeUrl } from "../extension/src/library-url.js";

describe("libraryHomeUrl", () => {
  it("opens the app home from the saved App URL", () => {
    expect(libraryHomeUrl("http://localhost:3000")).toBe("http://localhost:3000/");
    expect(libraryHomeUrl("https://memory404.vercel.app/")).toBe(
      "https://memory404.vercel.app/",
    );
    expect(libraryHomeUrl("  https://memory404.vercel.app/settings  ")).toBe(
      "https://memory404.vercel.app/",
    );
  });

  it("rejects a missing or unsafe App URL", () => {
    expect(libraryHomeUrl("")).toBeNull();
    expect(libraryHomeUrl("not a url")).toBeNull();
    expect(libraryHomeUrl("javascript:alert(1)")).toBeNull();
    expect(libraryHomeUrl("https://user:pass@memory404.vercel.app")).toBeNull();
  });
});
