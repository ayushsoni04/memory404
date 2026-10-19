"use client";

import { useRef, useState, type FormEvent, type Ref } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { CapsLockHint } from "@/components/auth/CapsLockHint";
import { SessionSignInLink } from "@/components/LoadRecovery";
import {
  authPasswordFieldClass,
  authQuietControlClass,
  authRevealClass,
} from "@/components/auth/auth-field";
import { authFailureMessage } from "@/lib/auth-form-error";
import { withAuthRedirect } from "@/lib/auth-redirect";
import { explainLoadError } from "@/lib/load-error";
import {
  firstPasswordChangeError,
  PASSWORD_HINT,
  passwordChangeErrors,
  type PasswordChangeErrors,
} from "@/lib/password-change";
import { visiblePasswordRequirementError } from "@/lib/password-policy";
import { visibleConfirmPasswordError } from "@/lib/password-confirm";
import { controlPress } from "@/components/vault/types";

const labelClass = "block text-xs font-medium text-muted";
const CURRENT_PASSWORD_INCORRECT = "Current password is incorrect";

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
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const savingLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const errors: PasswordChangeErrors = passwordChangeErrors({
    currentPassword,
    newPassword,
    confirmPassword,
  });
  const currentError = visibleError(attempted, currentPassword, errors.currentPassword);
  const newError = visiblePasswordRequirementError(
    newPassword,
    errors.newPassword,
    attempted,
  );
  const confirmError = visibleConfirmPasswordError(
    newPassword,
    confirmPassword,
    errors.confirmPassword,
    attempted,
  );
  const currentFieldError =
    currentError ??
    (serverError === CURRENT_PASSWORD_INCORRECT ? serverError : null);
  const bannerError =
    serverError && serverError !== CURRENT_PASSWORD_INCORRECT ? serverError : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (savingLock.current) return;
    setAttempted(true);
    setSaved(false);
    const issue = firstPasswordChangeError(errors);
    if (issue) {
      setServerError(null);
      if (errors.currentPassword) currentRef.current?.focus();
      else if (errors.newPassword) newRef.current?.focus();
      else confirmRef.current?.focus();
      return;
    }
    savingLock.current = true;
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
        const explained = explainLoadError(message) ?? message;
        setServerError(explained);
        if (explained === CURRENT_PASSWORD_INCORRECT) currentRef.current?.focus();
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
      savingLock.current = false;
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
          inputRef={currentRef}
          label="Current password"
          autoComplete="current-password"
          value={currentPassword}
          shown={showCurrent}
          onToggle={() => setShowCurrent((value) => !value)}
          toggleLabel={showCurrent ? "Hide current password" : "Show current password"}
          error={currentFieldError}
          errorId="current-password-error"
          onChange={(value) => {
            setCurrentPassword(value);
            setServerError(null);
            setSaved(false);
          }}
        />
        <PasswordField
          id="new-password"
          inputRef={newRef}
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
          inputRef={confirmRef}
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
        {bannerError ? (
          <div className="flex flex-col items-start gap-2" role="alert">
            <p className="text-[12px] text-danger">{bannerError}</p>
            <SessionSignInLink message={bannerError} returnPath="/settings" />
          </div>
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
          <Link
            href={withAuthRedirect("/forgot-password", "/settings")}
            className={authQuietControlClass}
          >
            Forgot your password?
          </Link>
        </div>
      </form>
    </section>
  );
}

function PasswordField({
  id,
  inputRef,
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
  inputRef?: Ref<HTMLInputElement>;
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
          ref={inputRef}
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
