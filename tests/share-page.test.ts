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

  it("keeps the timestamp when a watch link lists t before v", () => {
    const moment = savedPageKey(`https://www.youtube.com/watch?v=${VIDEO}&t=62`);
    expect(savedPageKey(`https://www.youtube.com/watch?t=1m2s&v=${VIDEO}`)).toBe(moment);
    expect(savedPageKey(`https://youtu.be/${VIDEO}?t=62`)).toBe(moment);
    expect(savedPageKey(`https://www.youtube.com/watch?v=${VIDEO}`)).not.toBe(moment);
    expect(savedPageKey(`https://www.youtube.com/watch?t=63&v=${VIDEO}`)).not.toBe(moment);

    const plain = savedPageKey("https://example.com/watch?v=abc&t=1m2s");
    expect(savedPageKey("https://example.com/watch?t=1m2s&v=abc")).toBe(plain);
    expect(plain).not.toBe(savedPageKey("https://example.com/watch?v=abc&t=62"));
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

  it("treats a Wikipedia article on the mobile host as the desktop article", () => {
    const key = savedPageKey("https://en.wikipedia.org/wiki/Ada_Lovelace");
    expect(savedPageKey("https://en.m.wikipedia.org/wiki/Ada_Lovelace")).toBe(key);
    expect(
      savedPageKey("https://en.m.wikipedia.org/wiki/Ada_Lovelace?wprov=sfla1"),
    ).toBe(key);
    expect(savedPageKey("https://de.wikipedia.org/wiki/Ada_Lovelace")).not.toBe(key);
    expect(savedPageKey("https://en.wikipedia.org/wiki/Alan_Turing")).not.toBe(key);

    const pattern = savedPageHostPattern("https://en.wikipedia.org/wiki/Ada_Lovelace");
    const re = new RegExp(pattern!, "i");
    expect(re.test("https://en.m.wikipedia.org/wiki/Ada_Lovelace")).toBe(true);
    expect(re.test("https://en.wikipedia.org.evil/wiki/Ada_Lovelace")).toBe(false);
  });

  it("treats a Reddit post as one page across hosts and title slugs", () => {
    const key = savedPageKey(
      "https://www.reddit.com/r/Design/comments/abc123/a_long_title/",
    );
    expect(savedPageKey("https://old.reddit.com/r/Design/comments/abc123/other_title")).toBe(
      key,
    );
    expect(savedPageKey("https://np.reddit.com/comments/abc123")).toBe(key);
    expect(savedPageKey("https://redd.it/abc123")).toBe(key);
    expect(
      savedPageKey("https://www.reddit.com/r/Design/comments/abc123/title/comment/def456"),
    ).not.toBe(key);
    expect(savedPageKey("https://www.reddit.com/r/Design/comments/xyz789/title")).not.toBe(
      key,
    );
    expect(savedPageKey("https://www.reddit.com/r/Design/")).not.toBe(key);

    const pattern = savedPageHostPattern(
      "https://old.reddit.com/r/Design/comments/abc123/title",
    );
    const re = new RegExp(pattern!, "i");
    expect(re.test("https://www.reddit.com/r/Design/comments/abc123/title")).toBe(true);
    expect(re.test("https://redd.it/abc123")).toBe(true);
    expect(re.test("https://reddit.com.evil/r/Design")).toBe(false);
  });

  it("treats a Spotify share link as the same track", () => {
    const key = savedPageKey("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT");
    expect(
      savedPageKey(
        "https://open.spotify.com/intl-de/track/4cOdK2wGLETKBW3PvgPWqT?si=shareSheet",
      ),
    ).toBe(key);
    expect(
      savedPageKey("https://open.spotify.com/track/1111111111111111111111"),
    ).not.toBe(key);
    expect(savedPageKey("https://open.spotify.com/search/ada")).not.toBe(key);
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
