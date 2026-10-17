import { describe, expect, it } from "vitest";
import { savedPageHostPattern, savedPageKey } from "@/lib/save-query";

const VIDEO = "dQw4w9WgXcQ";

describe("savedPageKey for a shared video or post", () => {
  it("treats YouTube share, embed, and short links as one video", () => {
    const key = savedPageKey(`https://www.youtube.com/watch?v=${VIDEO}`);
    expect(savedPageKey(`https://youtu.be/${VIDEO}`)).toBe(key);
    expect(savedPageKey(`https://youtu.be/${VIDEO}?si=shareSheet`)).toBe(key);
    expect(savedPageKey(`https://m.youtube.com/watch?v=${VIDEO}&feature=share`)).toBe(key);
    expect(savedPageKey(`https://www.youtube.com/embed/${VIDEO}`)).toBe(key);
    expect(savedPageKey(`https://www.youtube.com/shorts/${VIDEO}`)).toBe(key);
    expect(savedPageKey(`https://www.youtube-nocookie.com/embed/${VIDEO}`)).toBe(key);
    expect(savedPageKey(`https://www.youtube.com/watch?v=${VIDEO}&list=PLxxxxxxxx`)).toBe(key);
  });

  it("keeps a timestamp, and treats 1m2s and 62 seconds as the same moment", () => {
    const moment = savedPageKey(`https://youtu.be/${VIDEO}?t=62`);
    const start = savedPageKey(`https://www.youtube.com/watch?v=${VIDEO}`);
    expect(savedPageKey(`https://www.youtube.com/watch?v=${VIDEO}&t=1m2s`)).toBe(moment);
    expect(savedPageKey(`https://www.youtube.com/embed/${VIDEO}?start=62`)).toBe(moment);
    expect(moment).not.toBe(start);
    expect(savedPageKey(`https://youtu.be/${VIDEO}?t=0`)).toBe(start);
  });

  it("does not merge a different video, a channel, or YouTube Music", () => {
    const video = savedPageKey(`https://youtu.be/${VIDEO}`);
    expect(savedPageKey("https://youtu.be/abcdefghijk")).not.toBe(video);
    expect(savedPageKey("https://www.youtube.com/@figma")).not.toBe(video);
    expect(savedPageKey(`https://music.youtube.com/watch?v=${VIDEO}`)).not.toBe(video);
    expect(savedPageKey("https://www.youtube.com/playlist?list=PLxxxxxxxx")).not.toBe(video);
  });

  it("treats an X post on twitter.com and x.com as one post", () => {
    const key = savedPageKey("https://x.com/ayush/status/1780000000000000001");
    expect(savedPageKey("https://twitter.com/ayush/status/1780000000000000001?s=20")).toBe(key);
    expect(
      savedPageKey("https://mobile.twitter.com/i/web/status/1780000000000000001"),
    ).toBe(key);
    expect(
      savedPageKey("https://x.com/someone/status/1780000000000000001/photo/1"),
    ).toBe(key);
    expect(savedPageKey("https://x.com/ayush/status/1780000000000000002")).not.toBe(key);
  });

  it("treats the same X profile on either host as one page", () => {
    const key = savedPageKey("https://x.com/Ayush");
    expect(savedPageKey("https://twitter.com/ayush")).toBe(key);
    expect(savedPageKey("https://x.com/other")).not.toBe(key);
    expect(savedPageKey("https://x.com/explore")).not.toBe(
      savedPageKey("https://twitter.com/explore"),
    );
  });

  it("looks up the alias hosts when searching for an existing copy", () => {
    const pattern = savedPageHostPattern(`https://youtu.be/${VIDEO}`);
    expect(pattern).toBeTruthy();
    const re = new RegExp(pattern!, "i");
    expect(re.test(`https://www.youtube.com/watch?v=${VIDEO}`)).toBe(true);
    expect(re.test(`https://m.youtube.com/shorts/${VIDEO}`)).toBe(true);
    expect(re.test("https://youtube.com.evil/watch")).toBe(false);
    expect(re.test("https://example.com/watch")).toBe(false);

    const post = savedPageHostPattern("https://twitter.com/ayush/status/1780000000000000001");
    const postRe = new RegExp(post!, "i");
    expect(postRe.test("https://x.com/ayush/status/1780000000000000001")).toBe(true);
    expect(postRe.test("https://mobile.twitter.com/ayush/status/1780000000000000001")).toBe(
      true,
    );
  });
});
