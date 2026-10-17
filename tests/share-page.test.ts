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

  it("treats a Google Doc, its preview, and the Drive view as one file", () => {
    const id = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
    const key = savedPageKey(`https://docs.google.com/document/d/${id}/edit`);
    expect(
      savedPageKey(`https://docs.google.com/document/d/${id}/edit?usp=sharing`),
    ).toBe(key);
    expect(savedPageKey(`https://docs.google.com/document/u/0/d/${id}/preview`)).toBe(key);
    expect(
      savedPageKey(`https://drive.google.com/file/d/${id}/view?usp=drive_link`),
    ).toBe(key);
    expect(savedPageKey(`https://docs.google.com/document/d/${id}x/edit`)).not.toBe(key);
    expect(
      savedPageKey(`https://docs.google.com/spreadsheets/d/${id}sheet000000000000000/edit`),
    ).not.toBe(key);

    const folder = "1FolderIdxxxxxxxxxxxxxxxxxxxx";
    const folderKey = savedPageKey(
      `https://drive.google.com/drive/folders/${folder}`,
    );
    expect(
      savedPageKey(`https://drive.google.com/drive/u/1/folders/${folder}?usp=sharing`),
    ).toBe(folderKey);
    expect(folderKey).not.toBe(key);

    const pattern = savedPageHostPattern(`https://docs.google.com/document/d/${id}/edit`);
    const re = new RegExp(pattern!, "i");
    expect(re.test(`https://drive.google.com/file/d/${id}/view`)).toBe(true);
    expect(re.test("https://docs.google.com.evil/document/d/nope")).toBe(false);
    expect(re.test("https://sites.google.com/view/nope")).toBe(false);

    const published = savedPageKey(
      "https://docs.google.com/forms/d/e/1FAIpQLSdPublishedFormIdxxxxxxxxx/viewform",
    );
    expect(
      savedPageKey(
        "https://docs.google.com/forms/d/1FAIpQLSdEditorFormIdxxxxxxxxxxxx/edit",
      ),
    ).not.toBe(published);
  });

  it("treats Amazon share links for one product as one save", () => {
    const asin = "B08N5WRWNW";
    const key = savedPageKey(`https://www.amazon.com/Some-Product-Name/dp/${asin}/ref=sr_1_1`);
    expect(savedPageKey(`https://www.amazon.com/dp/${asin}?psc=1&tag=affiliate-20`)).toBe(key);
    expect(savedPageKey(`https://smile.amazon.com/gp/product/${asin}`)).toBe(key);
    expect(savedPageKey(`https://m.amazon.com/gp/aw/d/${asin}`)).toBe(key);
    expect(savedPageKey(`https://www.amazon.co.uk/dp/${asin}`)).not.toBe(key);
    expect(savedPageKey("https://www.amazon.com/dp/B08N5WRWNX")).not.toBe(key);
    expect(savedPageKey("https://www.amazon.com/s?k=chair")).not.toBe(key);

    const pattern = savedPageHostPattern(`https://www.amazon.com/dp/${asin}`);
    const re = new RegExp(pattern!, "i");
    expect(re.test(`https://smile.amazon.com/dp/${asin}`)).toBe(true);
    expect(re.test(`https://m.amazon.com/gp/product/${asin}`)).toBe(true);
    expect(re.test("https://amazon.com.evil/dp/B08N5WRWNW")).toBe(false);
    expect(re.test(`https://www.amazon.co.uk/dp/${asin}`)).toBe(false);
  });

  it("treats an Instagram post, reel, and carousel as one post", () => {
    const code = "CxyzAb12CdE";
    const key = savedPageKey(`https://www.instagram.com/p/${code}/`);
    expect(savedPageKey(`https://www.instagram.com/reel/${code}/?igsh=shareSheet`)).toBe(key);
    expect(savedPageKey(`https://m.instagram.com/reels/${code}`)).toBe(key);
    expect(savedPageKey(`https://instagram.com/tv/${code}?img_index=2`)).toBe(key);
    expect(savedPageKey(`https://www.instagram.com/p/${code.toLowerCase()}`)).not.toBe(key);
    expect(savedPageKey("https://www.instagram.com/figma/")).not.toBe(key);
    expect(savedPageKey("https://www.instagram.com/stories/figma/1234567890")).not.toBe(key);

    const pattern = savedPageHostPattern(`https://www.instagram.com/p/${code}/`);
    const re = new RegExp(pattern!, "i");
    expect(re.test(`https://m.instagram.com/reel/${code}`)).toBe(true);
    expect(re.test("https://instagram.com.evil/p/nope")).toBe(false);
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
