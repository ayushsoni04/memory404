"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import MorphText from "@/components/MorphText";
import {
  authPasswordFieldClass,
  authRevealClass,
  authSubmitClass,
} from "@/components/auth/auth-field";
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
    <div className="w-full space-y-6">
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
          <div className="space-y-1.5">
            <label htmlFor="reset-password" className="block text-[11px] font-medium text-muted">
              New password
            </label>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-describedby="reset-password-hint"
                className={authPasswordFieldClass}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className={authRevealClass}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p id="reset-password-hint" className="text-[10px] text-subtle">
              {PASSWORD_HINT}
            </p>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={authSubmitClass}
          >
            <MorphText duration={220}>
              {isSubmitting ? "Updating…" : "Update password"}
            </MorphText>
          </button>
        </form>
      )}
    </div>
  );
}
