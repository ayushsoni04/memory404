import { updateLink } from "@/lib/db/repositories";
import { extractLinkMetadata } from "@/lib/metadata";
import { capturePageScreenshotUrl } from "@/lib/screenshot";
import { requiresLoginPlaceholder } from "@/lib/links";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

/**
 * Fetches HTML metadata quickly, marks the link ready, then optionally upgrades
 * the preview image with a screenshot. Safe to fire-and-forget / run in `after()`.
 */
export async function enrichLinkMetadataInBackground(
  linkId: string,
  pageUrl: string,
): Promise<void> {
  try {
    // Phase 1 — HTML meta only (seconds, not tens of seconds).
    const meta = await extractLinkMetadata(pageUrl, pageUrl);
    const description =
      meta.description.length > 2000
        ? meta.description.slice(0, 2000)
        : meta.description;

    let imageUrl = meta.imageUrl;
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

    // Phase 2 — screenshot upgrade when og/twitter image is missing.
    // Never blocks "ready"; failures leave the meta image (or null) in place.
    if (imageUrl || requiresLoginPlaceholder(pageUrl)) return;

    try {
      const screenshotUrl = await capturePageScreenshotUrl(pageUrl);
      if (!screenshotUrl) return;
      const cloudinaryUrl = await uploadImageToCloudinary(screenshotUrl);
      await updateLink(
        { _id: linkId, deletedAt: null },
        { $set: { imageUrl: cloudinaryUrl || screenshotUrl } },
      );
    } catch (shotErr) {
      console.error("[enrich-link-metadata] screenshot", linkId, shotErr);
    }
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
