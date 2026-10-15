import { describe, expect, it } from "vitest";
import {
  firstPasswordChangeError,
  passwordChangeErrors,
} from "@/lib/password-change";

const valid = {
  currentPassword: "OldPassword1",
  newPassword: "NewPassword2",
  confirmPassword: "NewPassword2",
};

describe("passwordChangeErrors", () => {
  it("accepts a new password that meets the rules", () => {
    expect(passwordChangeErrors(valid)).toEqual({});
    expect(firstPasswordChangeError(passwordChangeErrors(valid))).toBeNull();
  });

  it("asks for the current password, a strong new one, and a match", () => {
    expect(
      passwordChangeErrors({
        currentPassword: "",
        newPassword: "short",
        confirmPassword: "other",
      }),
    ).toEqual({
      currentPassword: "Enter your current password.",
      newPassword: "Password must include: At least 8 characters, An uppercase letter, A number",
    });
  });

  it("rejects a repeat of the current password", () => {
    expect(
      passwordChangeErrors({
        currentPassword: "SamePassword1",
        newPassword: "SamePassword1",
        confirmPassword: "SamePassword1",
      }).newPassword,
    ).toBe("Choose a different password than the one you use now.");
  });

  it("says when the confirmation does not match", () => {
    expect(
      passwordChangeErrors({
        ...valid,
        confirmPassword: "NewPassword3",
      }).confirmPassword,
    ).toBe("Those new passwords do not match.");
  });
});
