"use client";

import Link from "next/link";
import { useState } from "react";

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
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-[380px] space-y-6">
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
                className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition"
                required
              />
            </label>

            {error && <p className="text-xs text-danger">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9 bg-pill-active text-pill-active-fg text-xs font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-subtle">
          <Link href="/login" className="text-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
