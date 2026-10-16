"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import MorphText from "@/components/MorphText";
import {
  authFieldClass,
  authLinkClass,
  authQuietControlClass,
  authSubmitClass,
} from "@/components/auth/auth-field";
import { EMAIL_INVALID, emailIssue, normalizeEmail } from "@/lib/auth-email";
import { withAuthRedirect } from "@/lib/auth-redirect";
import { authFailureMessage } from "@/lib/auth-form-error";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const address = normalizeEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (emailIssue(email)) {
      setError(EMAIL_INVALID);
      emailRef.current?.focus();
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      const data = await res.json().catch(() => ({}));
      setIsSubmitting(false);
      if (!res.ok) {
        setError(authFailureMessage(data, "Failed to send reset link"));
        return;
      }
      setSent(true);
    } catch {
      setError(authFailureMessage(null, "Failed to send reset link", true));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-bold font-mono uppercase text-foreground">
          Reset your password
        </h1>
        <p className="text-xs text-subtle">
          We&apos;ll email you a link to choose a new one.
        </p>
      </div>

      {sent ? (
        <div className="space-y-3">
          <p className="text-sm text-success" role="status">
            If an account exists for {address}, a reset link is on its way.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setError(null);
            }}
            className={authQuietControlClass}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium text-muted">Email address</span>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "forgot-email-error" : undefined}
              className={authFieldClass}
              required
            />
          </label>

          {error ? (
            <p id="forgot-email-error" className="text-xs text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className={authSubmitClass}
          >
            <MorphText duration={220}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </MorphText>
          </button>
        </form>
      )}

      <p className="text-center text-xs text-subtle">
        <Link
          href={withAuthRedirect("/login", searchParams?.get("redirect"))}
          className={authLinkClass}
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
