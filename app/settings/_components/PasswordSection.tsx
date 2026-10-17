"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { CapsLockHint } from "@/components/auth/CapsLockHint";
import {
  authPasswordFieldClass,
  authQuietControlClass,
  authRevealClass,
} from "@/components/auth/auth-field";
import { authFailureMessage } from "@/lib/auth-form-error";
import { explainLoadError } from "@/lib/load-error";
import {
  firstPasswordChangeError,
  PASSWORD_HINT,
  passwordChangeErrors,
  type PasswordChangeErrors,
} from "@/lib/password-change";
import { controlPress } from "@/components/vault/types";

const labelClass = "block text-xs font-medium text-muted";

function visibleError(
  attempted: boolean,
  value: string,
  message: string | undefined,
): string | null {
  if (!message) return null;
  if (attempted || value.length > 0) return message;
  return null;
}

export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const errors: PasswordChangeErrors = passwordChangeErrors({
    currentPassword,
    newPassword,
    confirmPassword,
  });
  const currentError = visibleError(attempted, currentPassword, errors.currentPassword);
  const newError = visibleError(attempted, newPassword, errors.newPassword);
  const confirmError = visibleError(attempted, confirmPassword, errors.confirmPassword);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    setSaved(false);
    const issue = firstPasswordChangeError(errors);
    if (issue) {
      setServerError(null);
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = authFailureMessage(data, "Could not update your password.");
        setServerError(explainLoadError(message) ?? message);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setAttempted(false);
      setSaved(true);
    } catch {
      setServerError(
        authFailureMessage(null, "Could not update your password.", true),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 border-t border-border pt-6">
      <div>
        <h3 className="text-xs font-mono tracking-wider text-subtle uppercase">
          Password
        </h3>
        <p className="mt-0.5 text-xs text-subtle">
          Choose a new password for this account. You stay signed in.
        </p>
      </div>
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        <PasswordField
          id="current-password"
          label="Current password"
          autoComplete="current-password"
          value={currentPassword}
          shown={showCurrent}
          onToggle={() => setShowCurrent((value) => !value)}
          toggleLabel={showCurrent ? "Hide current password" : "Show current password"}
          error={currentError}
          errorId="current-password-error"
          onChange={(value) => {
            setCurrentPassword(value);
            setServerError(null);
            setSaved(false);
          }}
        />
        <PasswordField
          id="new-password"
          label="New password"
          autoComplete="new-password"
          value={newPassword}
          shown={showNew}
          onToggle={() => setShowNew((value) => !value)}
          toggleLabel={showNew ? "Hide new password" : "Show new password"}
          error={newError}
          errorId="new-password-error"
          hint={PASSWORD_HINT}
          onChange={(value) => {
            setNewPassword(value);
            setServerError(null);
            setSaved(false);
          }}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          shown={showConfirm}
          onToggle={() => setShowConfirm((value) => !value)}
          toggleLabel={
            showConfirm ? "Hide confirmed password" : "Show confirmed password"
          }
          error={confirmError}
          errorId="confirm-password-error"
          onChange={(value) => {
            setConfirmPassword(value);
            setServerError(null);
            setSaved(false);
          }}
        />
        {serverError ? (
          <p className="text-[12px] text-danger" role="alert">
            {serverError}
          </p>
        ) : null}
        {saved ? (
          <p className="text-[12px] text-success" role="status">
            Password updated.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-pill-active px-4 text-sm font-medium text-pill-active-fg shadow-md hover:opacity-90 disabled:opacity-50 ${controlPress}`}
          >
            {saving ? "Updating…" : "Update password"}
          </button>
          <Link href="/forgot-password" className={authQuietControlClass}>
            Forgot your password?
          </Link>
        </div>
      </form>
    </section>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  shown,
  onToggle,
  toggleLabel,
  error,
  errorId,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  shown: boolean;
  onToggle: () => void;
  toggleLabel: string;
  error: string | null;
  errorId: string;
  hint?: string;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const describedBy = [hint ? `${id}-hint` : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative max-w-md">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(event.target.value)}
          className={authPasswordFieldClass}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleLabel}
          className={authRevealClass}
        >
          {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-[11px] text-subtle">
          {hint}
        </p>
      ) : null}
      <CapsLockHint active={focused} />
      {error ? (
        <p id={errorId} className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
