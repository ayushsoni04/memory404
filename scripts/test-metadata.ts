/**
 * Run from repo root: npm run test:metadata
 *
 * Hits real URLs — checks title quality, description snippet, preview image.
 * If many rows show the raw URL as title, your Node/SSL environment may be
 * blocking HTTPS (e.g. corporate proxy); production servers usually work fine.
 */
import {
  decodeHtmlEntities,
  extractLinkMetadata,
  isGarbageTitle,
} from "../lib/metadata";

const SAMPLES: { label: string; url: string }[] = [
  { label: "YouTube video", url: "https://www.youtube.com/watch?v=jNQXAC9IVRw" },
  { label: "Next.js docs", url: "https://nextjs.org/docs/app/building-your-application/routing" },
  { label: "MDN Fetch", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API" },
  { label: "GitHub repo", url: "https://github.com/facebook/react" },
  {
    label: "Stack Overflow Q",
    url: "https://stackoverflow.com/questions/11832914/how-to-round-in-javascript",
  },
  { label: "Medium tag hub", url: "https://medium.com/tag/javascript" },
  { label: "Minimal page", url: "https://example.com" },
  { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Open_graph" },
];

async function main() {
  console.log("decodeHtmlEntities:", decodeHtmlEntities("Foo &amp; Bar &#39;Baz&#39;"));

  for (const { label, url } of SAMPLES) {
    const m = await extractLinkMetadata(url, url);
    const bad = isGarbageTitle(m.title, url) ? " ⚠️ garbage?" : "";
    console.log("\n──", label, "──");
    console.log("URL:", url);
    console.log("title:", m.title + bad);
    console.log(
      "description:",
      m.description
        ? m.description.slice(0, 100) + (m.description.length > 100 ? "…" : "")
        : "(none)",
    );
    console.log("imageUrl:", m.imageUrl ?? "(none)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
