import { getPasswordRequirementIssues } from "@/lib/password-policy";

export type SignupPasswordErrors = {
  password?: string;
  confirm?: string;
};

/** Field errors for a new account, before the request is sent. */
export function signupPasswordErrors(
  password: string,
  confirm: string,
): SignupPasswordErrors {
  const errors: SignupPasswordErrors = {};
  if (!password) {
    errors.password = "Enter a password.";
  } else {
    const issues = getPasswordRequirementIssues(password);
    if (issues.length > 0) {
      errors.password = `Password must include: ${issues.join(", ")}`;
    }
  }
  if (!errors.password) {
    if (!confirm) errors.confirm = "Confirm your password.";
    else if (password !== confirm) {
      errors.confirm = "Those passwords do not match.";
    }
  }
  return errors;
}
