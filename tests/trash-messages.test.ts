import { describe, expect, it } from "vitest";
import { SESSION_EXPIRED_MESSAGE, UNREACHABLE_MESSAGE } from "@/lib/load-error";
import {
  TRASH_ACTION_FAILED,
  TRASH_LOAD_FAILED,
  trashActionMessage,
  trashLoadHint,
  trashLoadMessage,
} from "@/lib/trash-messages";

describe("trash messages", () => {
  it("replaces a bare load failure and keeps a real reason", () => {
    expect(trashLoadMessage("Failed")).toBe(TRASH_LOAD_FAILED);
    expect(trashLoadMessage("Failed to load trash")).toBe(TRASH_LOAD_FAILED);
    expect(trashLoadMessage("")).toBe(TRASH_LOAD_FAILED);
    expect(trashLoadMessage("Failed to fetch")).toBe(UNREACHABLE_MESSAGE);
    expect(trashLoadMessage("Unauthorized")).toBe(SESSION_EXPIRED_MESSAGE);
    expect(trashLoadMessage("Trash is locked")).toBe("Trash is locked");
  });

  it("replaces a bare action failure and keeps a real reason", () => {
    expect(trashActionMessage({})).toBe(TRASH_ACTION_FAILED);
    expect(trashActionMessage({ error: "Request failed" })).toBe(TRASH_ACTION_FAILED);
    expect(trashActionMessage(null, true)).toBe(UNREACHABLE_MESSAGE);
    expect(trashActionMessage({ error: "Unauthorized" })).toBe(SESSION_EXPIRED_MESSAGE);
    expect(trashActionMessage({ error: "Could not restore that link" })).toBe(
      "Could not restore that link",
    );
  });

  it("only mentions the connection when the request never arrived", () => {
    expect(trashLoadHint(UNREACHABLE_MESSAGE)).toBe(
      "Check your connection, then try again.",
    );
    expect(trashLoadHint(SESSION_EXPIRED_MESSAGE)).toBe(
      "Sign in, then open Trash again.",
    );
    expect(trashLoadHint(TRASH_LOAD_FAILED)).toBe("Try again in a moment.");
  });
});
