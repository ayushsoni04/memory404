import { Resend } from "resend";

const FROM_ADDRESS = "memory404 <onboarding@resend.dev>";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn(
      `sendPasswordResetEmail: RESEND_API_KEY is not configured — email not sent. Reset link for ${email}: ${resetUrl}`,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Reset your memory404 password",
    html: `
      <p>Someone requested a password reset for this email address.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  if (error) {
    console.error("sendPasswordResetEmail:", error);
  }
}
