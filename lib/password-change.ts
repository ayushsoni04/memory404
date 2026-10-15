import {
  getPasswordRequirementIssues,
  PASSWORD_HINT,
} from "@/lib/password-policy";

export { PASSWORD_HINT };

export type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordChangeErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

/** Field errors for a signed-in password change, before the request is sent. */
export function passwordChangeErrors(input: PasswordChangeInput): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {};
  if (!input.currentPassword) {
    errors.currentPassword = "Enter your current password.";
  }
  if (!input.newPassword) {
    errors.newPassword = "Enter a new password.";
  } else {
    const issues = getPasswordRequirementIssues(input.newPassword);
    if (issues.length > 0) {
      errors.newPassword = `Password must include: ${issues.join(", ")}`;
    } else if (
      input.currentPassword &&
      input.newPassword === input.currentPassword
    ) {
      errors.newPassword = "Choose a different password than the one you use now.";
    }
  }
  if (!errors.newPassword) {
    if (!input.confirmPassword) {
      errors.confirmPassword = "Confirm your new password.";
    } else if (input.newPassword !== input.confirmPassword) {
      errors.confirmPassword = "Those new passwords do not match.";
    }
  }
  return errors;
}

export function firstPasswordChangeError(
  errors: PasswordChangeErrors,
): string | null {
  return errors.currentPassword ?? errors.newPassword ?? errors.confirmPassword ?? null;
}
