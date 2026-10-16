"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import MorphText from "@/components/MorphText";
import { CapsLockHint } from "@/components/auth/CapsLockHint";
import {
  authFieldClass,
  authLinkClass,
  authPasswordFieldClass,
  authQuietControlClass,
  authRevealClass,
  authSubmitClass,
} from "@/components/auth/auth-field";
import { EMAIL_INVALID, emailIssue, normalizeEmail } from "@/lib/auth-email";
import { withAuthRedirect } from "@/lib/auth-redirect";
import { authFailureMessage } from "@/lib/auth-form-error";
import { safeRedirectPath } from "@/lib/safe-redirect";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectPath = safeRedirectPath(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const allowDevSkip = process.env.NODE_ENV !== "production";

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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(email), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(authFailureMessage(data, "Failed to sign in"));
        setIsSubmitting(false);
        return;
      }
      window.location.assign(redirectPath);
    } catch {
      setError(authFailureMessage(null, "Failed to sign in", true));
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setError(null);
    setIsSkipping(true);
    try {
      const res = await fetch("/api/auth/dev-skip", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to skip sign-in");
        setIsSkipping(false);
        return;
      }
      // Hard navigation so the new session cookie is always sent on the next request.
      window.location.assign(redirectPath);
    } catch {
      setError("Failed to skip sign-in");
      setIsSkipping(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-bold font-mono uppercase text-foreground">
          Sign in
        </h1>
        <p className="text-xs text-subtle">
          Welcome back — pick up where you left off.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-medium text-muted">Email address</span>
          <input
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={authFieldClass}
            required
          />
        </label>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="block text-[11px] font-medium text-muted">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
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
          <CapsLockHint active={passwordFocused} />
        </div>

        <div className="flex justify-end">
          <Link
            href={withAuthRedirect("/forgot-password", searchParams.get("redirect"))}
            className={authQuietControlClass}
          >
            Forgot password?
          </Link>
        </div>

        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || isSkipping}
          className={authSubmitClass}
        >
          <MorphText duration={220}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </MorphText>
        </button>
      </form>

      <p className="text-center text-xs text-subtle">
        Don&apos;t have an account?{" "}
        <Link
          href={withAuthRedirect("/signup", searchParams.get("redirect"))}
          className={authLinkClass}
        >
          Sign up
        </Link>
      </p>

      {allowDevSkip && (
        <button
          type="button"
          onClick={handleSkip}
          disabled={isSubmitting || isSkipping}
          className={`w-full text-center ${authQuietControlClass}`}
        >
          {isSkipping ? "Skipping…" : "Skip for now"}
        </button>
      )}
    </div>
  );
}
