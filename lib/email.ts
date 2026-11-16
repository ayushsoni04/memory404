import { Resend } from "resend";

const DEFAULT_FROM = "memory404 <onboarding@resend.dev>";

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  return from || DEFAULT_FROM;
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Outside production, print the reset link to the server log whenever the
 * email could not be sent, so the flow stays testable without a verified
 * Resend domain.
 */
function logResetLinkForDev(email: string, resetUrl: string): void {
  if (process.env.NODE_ENV === "production") return;
  console.info(`[dev] Password reset link for ${email}: ${resetUrl}`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn(
      "sendPasswordResetEmail: RESEND_API_KEY is not configured — email not sent.",
    );
    logResetLinkForDev(email, resetUrl);
    return;
  }

  const safeUrl = escapeHtml(resetUrl);
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: email,
    subject: "Reset your memory404 password",
    html: `
      <p>Someone requested a password reset for this email address.</p>
      <p><a href="${safeUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  if (error) {
    console.error(
      `sendPasswordResetEmail: Resend rejected the email (from "${getFromAddress()}"). ` +
        "The sender must use a domain verified at resend.com/domains — " +
        "onboarding@resend.dev can only send to the Resend account owner.",
      error,
    );
    logResetLinkForDev(email, resetUrl);
  }
}
