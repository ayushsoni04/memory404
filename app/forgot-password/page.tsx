"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import MorphText from "@/components/MorphText";
import { authFieldClass, authLinkClass, authSubmitClass } from "@/components/auth/auth-field";
import { authFailureMessage } from "@/lib/auth-form-error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
    <AuthShell>
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
          <p className="text-sm text-success">
            If an account exists for {email}, a reset link is on its way.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium text-muted">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={authFieldClass}
                required
              />
            </label>

            {error ? (
              <p className="text-xs text-danger" role="alert">
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
          <Link href="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
