/**
 * A 409 from POST /api/links is an existing URL, including one in Trash.
 * It is not a newly saved link.
 */
/**
 * @param {number} status
 * @param {unknown} data
 */
export function classifyLinkSave(status, data) {
  const body = data && typeof data === "object" ? data : {};
  const link = body.link && typeof body.link === "object" ? body.link : null;
  const existingId = typeof body.existingId === "string" ? body.existingId : null;

  if (status >= 200 && status < 300) {
    return { kind: "saved", link, message: null };
  }

  if (status === 409 && (existingId || link?.id)) {
    const serverMessage = typeof body.error === "string" ? body.error.trim() : "";
    return {
      kind: "duplicate",
      link: link || { id: existingId },
      message: serverMessage || "A link with this URL already exists.",
    };
  }

  const serverMessage = typeof body.error === "string" ? body.error.trim() : "";
  return {
    kind: "error",
    link: null,
    message: serverMessage || `Save failed (${status})`,
  };
}

/**
 * @param {{
 *   total?: number,
 *   saved?: number,
 *   already?: number,
 *   failed?: number,
 *   skipped?: number,
 *   duplicateMessage?: string,
 * }} [counts]
 */
export function saveHeadline({
  total = 0,
  saved,
  already = 0,
  failed = 0,
  skipped = 0,
  duplicateMessage = "",
} = {}) {
  const created =
    typeof saved === "number"
      ? saved
      : Math.max(0, total - already - failed - skipped);
  if (created === 0 && already > 0 && failed === 0 && skipped === 0) {
    return {
      title: "Already in memory404",
      detail:
        already === 1
          ? duplicateMessage || "A link with this URL already exists."
          : `${already} links were already saved.`,
      offerNote: false,
    };
  }

  if (created === 0 && already === 0 && failed === 0 && skipped > 0) {
    return {
      title: "Nothing was saved",
      detail:
        skipped === 1
          ? "This page can't be saved."
          : `${skipped} pages were skipped.`,
      offerNote: false,
    };
  }

  if (total > 1) {
    const extra = [];
    if (already > 0) {
      extra.push(`${already} already saved`);
    }
    if (failed > 0) extra.push(`${failed} failed`);
    if (skipped > 0) extra.push(`${skipped} skipped`);
    return {
      title:
        created === 0
          ? already > 0
            ? "Nothing new was saved"
            : "Nothing was saved"
          : `Saved ${created} of ${total}`,
      detail: extra.length ? extra.join(" · ") : null,
      offerNote: false,
    };
  }

  return {
    title: "Saved to memory404",
    detail: null,
    offerNote: created > 0 && already === 0 && failed === 0,
  };
}

/**
 * How a finished batch should be stored and badged.
 * A batch that only skipped pages is not a successful save.
 * @param {{ saved?: number, already?: number, failed?: number, skipped?: number }} [counts]
 */
export function saveJobSettled({
  saved = 0,
  already = 0,
  failed = 0,
  skipped = 0,
} = {}) {
  if (saved <= 0 && already <= 0 && failed > 0) {
    return { status: "error", badge: "!" };
  }
  if (saved <= 0 && already <= 0 && skipped > 0) {
    return { status: "saved", badge: "" };
  }
  return { status: "saved", badge: "✓" };
}
