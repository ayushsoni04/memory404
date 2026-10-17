import { describe, expect, it } from "vitest";
import {
  confirmPasswordStillTyping,
  visibleConfirmPasswordError,
} from "@/lib/password-confirm";

const mismatch = "Those passwords do not match.";

describe("confirmPasswordStillTyping", () => {
  it("stays quiet while the confirmation is still the start of the password", () => {
    expect(confirmPasswordStillTyping("Memory404", "Memor")).toBe(true);
    expect(confirmPasswordStillTyping("Memory404", "")).toBe(false);
    expect(confirmPasswordStillTyping("Memory404", "Memory404")).toBe(false);
    expect(confirmPasswordStillTyping("Memory404", "Memory405")).toBe(false);
    expect(confirmPasswordStillTyping("Memory404", "memory")).toBe(false);
  });
});

describe("visibleConfirmPasswordError", () => {
  it("hides a prefix and shows a confirmation that has already diverged", () => {
    expect(visibleConfirmPasswordError("Memory404", "Memor", mismatch, false)).toBeNull();
    expect(visibleConfirmPasswordError("Memory404", "", mismatch, false)).toBeNull();
    expect(visibleConfirmPasswordError("Memory404", "Memory405", mismatch, false)).toBe(
      mismatch,
    );
    expect(visibleConfirmPasswordError("Memory404", "Memor", mismatch, true)).toBe(mismatch);
    expect(visibleConfirmPasswordError("Memory404", "Memory404", undefined, false)).toBeNull();
  });
});
