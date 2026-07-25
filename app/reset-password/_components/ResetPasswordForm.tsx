"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getPasswordRequirementIssues, PASSWORD_HINT } from "@/lib/password-policy";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid or expired.");
      return;
    }

    const issues = getPasswordRequirementIssues(password);
    if (issues.length > 0) {
      setError(PASSWORD_HINT);
      return;
    }

    setIsSubmitting(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setIsSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to reset password");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  };

  return (
    <div className="w-full max-w-[380px] space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-bold font-mono uppercase text-foreground">
          Choose a new password
        </h1>
        <p className="text-xs text-subtle">
          This replaces your current password.
        </p>
      </div>

      {done ? (
        <p className="text-sm text-success">Password updated — sign in with your new password…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium text-muted">New password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 pr-10 text-sm text-foreground outline-none focus:border-foreground/30 transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-subtle hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <span className="block text-[10px] text-subtle">{PASSWORD_HINT}</span>
          </label>

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 bg-pill-active text-pill-active-fg text-xs font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
