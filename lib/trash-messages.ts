import {
  explainLoadError,
  SESSION_EXPIRED_MESSAGE,
  UNREACHABLE_MESSAGE,
} from "@/lib/load-error";

/** Shown when Trash could not be loaded and the server gave no real reason. */
export const TRASH_LOAD_FAILED = "Couldn't load Trash. Try again.";

/** Shown when restore or permanent delete failed and the server gave no real reason. */
export const TRASH_ACTION_FAILED = "Couldn't update Trash. Try again.";

const BARE_FAILURE = /^(failed|request failed|failed to load trash)\.?$/i;

function readError(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const error = (data as { error?: unknown }).error;
  return typeof error === "string" ? error.trim() : "";
}

/** Why Trash did not load. A dropped request uses the library sentence. */
export function trashLoadMessage(message: string | null | undefined): string {
  const explained = explainLoadError(message);
  if (!explained || BARE_FAILURE.test(explained)) return TRASH_LOAD_FAILED;
  return explained;
}

/** Why a restore or a permanent delete did not stick. */
export function trashActionMessage(data: unknown, offline = false): string {
  if (offline) return UNREACHABLE_MESSAGE;
  const explained = explainLoadError(readError(data));
  if (!explained || BARE_FAILURE.test(explained)) return TRASH_ACTION_FAILED;
  return explained;
}

/** The line under a Trash load error. Only a dead connection mentions the connection. */
export function trashLoadHint(message: string): string {
  if (message === UNREACHABLE_MESSAGE) return "Check your connection, then try again.";
  if (message === SESSION_EXPIRED_MESSAGE) return "Sign in, then open Trash again.";
  return "Try again in a moment.";
}
