"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import MorphText from "@/components/MorphText";
import { CapsLockHint } from "@/components/auth/CapsLockHint";
import {
  authLinkClass,
  authPasswordFieldClass,
  authRevealClass,
  authSubmitClass,
} from "@/components/auth/auth-field";
import { authFailureMessage } from "@/lib/auth-form-error";
import { PASSWORD_HINT, visiblePasswordRequirementError } from "@/lib/password-policy";
import { visibleConfirmPasswordError } from "@/lib/password-confirm";
import { resetPasswordErrors } from "@/lib/reset-password";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const missingToken = token.length === 0;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const fieldErrors = resetPasswordErrors(password, confirm);
  const passwordError = visiblePasswordRequirementError(
    password,
    fieldErrors.password,
    attempted,
  );
  const confirmError = visibleConfirmPasswordError(
    password,
    confirm,
    fieldErrors.confirm,
    attempted,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid or expired.");
      return;
    }

    setAttempted(true);
    if (fieldErrors.password || fieldErrors.confirm) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      setIsSubmitting(false);

      if (!res.ok) {
        setError(authFailureMessage(data, "Failed to reset password"));
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError(authFailureMessage(null, "Failed to reset password", true));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-bold font-mono uppercase text-foreground">
          {missingToken ? "Reset link expired" : "Choose a new password"}
        </h1>
        <p className="text-xs text-subtle">
          {missingToken
            ? "Request a new one to choose a password."
            : "This replaces your current password."}
        </p>
      </div>

      {missingToken ? (
        <div className="space-y-4">
          <p className="text-xs text-danger" role="alert">
            This reset link is invalid or expired.
          </p>
          <Link
            href="/forgot-password"
            className={`${authSubmitClass} inline-flex items-center justify-center`}
          >
            Request a new link
          </Link>
          <p className="text-center text-xs text-subtle">
            <Link href="/login" className={authLinkClass}>
              Back to sign in
            </Link>
          </p>
        </div>
      ) : done ? (
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
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={
                  passwordError ? "reset-password-hint reset-password-error" : "reset-password-hint"
                }
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
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
            <CapsLockHint active={passwordFocused} />
            {passwordError ? (
              <p id="reset-password-error" className="text-xs text-danger" role="alert">
                {passwordError}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reset-password-confirm" className="block text-[11px] font-medium text-muted">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="reset-password-confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={confirmError ? true : undefined}
                aria-describedby={confirmError ? "reset-password-confirm-error" : undefined}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                className={authPasswordFieldClass}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide confirmed password" : "Show confirmed password"}
                className={authRevealClass}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {confirmError ? (
              <p id="reset-password-confirm-error" className="text-xs text-danger" role="alert">
                {confirmError}
              </p>
            ) : null}
            <CapsLockHint active={confirmFocused} />
          </div>

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
              {isSubmitting ? "Updating…" : "Update password"}
            </MorphText>
          </button>
        </form>
      )}
    </div>
  );
}
