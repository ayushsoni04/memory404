import { prisma } from "@/lib/prisma";
import { extractLinkMetadata } from "@/lib/metadata";

/**
 * Fetches HTML metadata and updates the link row. Safe to fire-and-forget.
 * On failure: leaves title as the initial URL fallback and still marks ready.
 * No retries (MVP).
 */
export async function enrichLinkMetadataInBackground(
  linkId: string,
  pageUrl: string,
): Promise<void> {
  try {
    const meta = await extractLinkMetadata(pageUrl, pageUrl);
    const description =
      meta.description.length > 2000
        ? meta.description.slice(0, 2000)
        : meta.description;

    await prisma.link.update({
      where: { id: linkId },
      data: {
        title: meta.title,
        description: description || null,
        imageUrl: meta.imageUrl,
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
