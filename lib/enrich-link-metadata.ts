import { updateLink } from "@/lib/db/repositories";
import { extractLinkMetadata } from "@/lib/metadata";
import { requiresLoginPlaceholder } from "@/lib/links";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

/**
 * Fetches HTML metadata (og/twitter image, title, favicon) and marks the link ready.
 * Does not capture live page screenshots — those lag enrichment and often store
 * interstitial frames ("Downloading eBook. Please wait…") as the preview.
 * Safe to fire-and-forget / run in `after()`.
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

    let imageUrl = requiresLoginPlaceholder(pageUrl) ? null : meta.imageUrl;
    if (imageUrl) {
      const cloudinaryUrl = await uploadImageToCloudinary(imageUrl);
      if (cloudinaryUrl) {
        imageUrl = cloudinaryUrl;
      }
    }

    await updateLink(
      { _id: linkId, deletedAt: null },
      {
        $set: {
          title: meta.title,
          description: description || null,
          imageUrl: imageUrl || null,
          faviconUrl: meta.faviconUrl,
          metadataStatus: "ready",
        },
      },
    );
  } catch (e) {
    console.error("[enrich-link-metadata]", linkId, e);
    try {
      await updateLink(
        { _id: linkId, deletedAt: null },
        { $set: { metadataStatus: "ready" } },
      );
    } catch (inner) {
      console.error(
        "[enrich-link-metadata] status update failed",
        linkId,
        inner,
      );
    }
  }
}
