import { getPasswordRequirementIssues } from "@/lib/password-policy";

export type ResetPasswordErrors = {
  password?: string;
  confirm?: string;
};

/** Field errors for an emailed reset, before the request is sent. */
export function resetPasswordErrors(
  password: string,
  confirm: string,
): ResetPasswordErrors {
  const errors: ResetPasswordErrors = {};
  if (!password) {
    errors.password = "Enter a new password.";
  } else {
    const issues = getPasswordRequirementIssues(password);
    if (issues.length > 0) {
      errors.password = `Password must include: ${issues.join(", ")}`;
    }
  }
  if (!errors.password) {
    if (!confirm) errors.confirm = "Confirm your new password.";
    else if (password !== confirm) {
      errors.confirm = "Those new passwords do not match.";
    }
  }
  return errors;
}
