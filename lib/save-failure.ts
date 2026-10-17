import { explainLoadError, UNREACHABLE_MESSAGE } from "@/lib/load-error";

/** Shown when a save reached memory404 and still did not stick. */
export const SAVE_FAILED = "Couldn't save that link. Try again.";

/** Shown when a note reached memory404 and still did not stick. */
export const NOTE_SAVE_FAILED = "Couldn't save the note. Try again.";

function readError(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const error = (data as { error?: unknown }).error;
  return typeof error === "string" ? error.trim() : "";
}

/**
 * Why a link did not save.
 * A dropped connection uses the same sentence as the rest of the library.
 * A bare "Failed to save" from the server is rewritten; a real reason stays.
 */
export function saveFailureMessage(data: unknown, offline = false): string {
  if (offline) return UNREACHABLE_MESSAGE;
  const raw = readError(data);
  if (!raw || /^failed to save\b/i.test(raw)) return SAVE_FAILED;
  return explainLoadError(raw) ?? SAVE_FAILED;
}

/** Why a note did not save. A dropped connection uses the library sentence. */
export function noteSaveFailureMessage(data: unknown, offline = false): string {
  if (offline) return UNREACHABLE_MESSAGE;
  const raw = readError(data);
  if (!raw) return NOTE_SAVE_FAILED;
  return explainLoadError(raw) ?? NOTE_SAVE_FAILED;
}
