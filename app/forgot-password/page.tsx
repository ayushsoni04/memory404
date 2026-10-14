"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import MorphText from "@/components/MorphText";
import { authFieldClass, authLinkClass, authSubmitClass } from "@/components/auth/auth-field";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to send reset link");
      return;
    }
    setSent(true);
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

            {error && <p className="text-xs text-danger">{error}</p>}

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
