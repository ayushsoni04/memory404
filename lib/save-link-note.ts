import { apiUrl } from "@/lib/api-base";
import type { LinkApiRow } from "@/lib/links";
import { noteIssue } from "@/lib/note-limit";
import { noteSaveFailureMessage } from "@/lib/save-failure";

export type SaveLinkNoteResult =
  | { ok: true; link: LinkApiRow }
  | { ok: false; error: string };

/** Persist a note. A failed request returns the message instead of throwing. */
export async function saveLinkNote(
  linkId: string,
  notes: string,
): Promise<SaveLinkNoteResult> {
  const issue = noteIssue(notes);
  if (issue) return { ok: false, error: issue };
  try {
    const res = await fetch(apiUrl(`/api/links/${linkId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data || typeof data !== "object" || !("link" in data) || !data.link) {
      return { ok: false, error: noteSaveFailureMessage(data) };
    }
    return { ok: true, link: data.link as LinkApiRow };
  } catch {
    return { ok: false, error: noteSaveFailureMessage(null, true) };
  }
}
