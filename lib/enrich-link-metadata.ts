import { prisma } from "@/lib/prisma";
import { extractLinkMetadata } from "@/lib/metadata";
import { capturePageScreenshotUrl } from "@/lib/screenshot";

/**
 * Fetches HTML metadata + page screenshot and updates the link row.
 * Safe to fire-and-forget. On failure: still marks ready.
 */
export async function enrichLinkMetadataInBackground(
  linkId: string,
  pageUrl: string,
): Promise<void> {
  try {
    const [meta, screenshotUrl] = await Promise.all([
      extractLinkMetadata(pageUrl, pageUrl),
      capturePageScreenshotUrl(pageUrl),
    ]);
    const description =
      meta.description.length > 2000
        ? meta.description.slice(0, 2000)
        : meta.description;

    // Prefer live page screenshot; fall back to og/twitter image.
    const imageUrl = screenshotUrl || meta.imageUrl;

    await prisma.link.update({
      where: { id: linkId },
      data: {
        title: meta.title,
        description: description || null,
        imageUrl,
        faviconUrl: meta.faviconUrl,
        metadataStatus: "ready",
      },
    });
  } catch (e) {
    console.error("[enrich-link-metadata]", linkId, e);
    try {
      await prisma.link.update({
        where: { id: linkId },
        data: { metadataStatus: "ready" },
      });
    } catch (inner) {
      console.error("[enrich-link-metadata] status update failed", linkId, inner);
    }
  }
}
