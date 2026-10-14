"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import MorphText from "@/components/MorphText";
import {
  authFieldClass,
  authLinkClass,
  authPasswordFieldClass,
  authQuietControlClass,
  authRevealClass,
  authSubmitClass,
} from "@/components/auth/auth-field";
import { authFailureMessage } from "@/lib/auth-form-error";
import { getPasswordRequirementIssues, PASSWORD_HINT } from "@/lib/password-policy";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LEAD_SOURCE_OPTIONS, readUtmFromSearchParams } from "@/lib/utm";

export function SignupForm() {
  const searchParams = useSearchParams();
  const redirectPath = safeRedirectPath(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [leadSource, setLeadSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const allowDevSkip = process.env.NODE_ENV !== "production";

  const passwordIssues = getPasswordRequirementIssues(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length > 0 && passwordIssues.length > 0) {
      setError(PASSWORD_HINT);
      return;
    }

    setIsSubmitting(true);
    const utm = readUtmFromSearchParams(searchParams);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          leadSource: leadSource || undefined,
          utm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(authFailureMessage(data, "Failed to create account"));
        setIsSubmitting(false);
        return;
      }
      window.location.assign(redirectPath);
    } catch {
      setError(authFailureMessage(null, "Failed to create account", true));
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
          Create your account
        </h1>
        <p className="text-xs text-subtle">
          Start archiving links in high-fidelity.
        </p>
      </div>

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

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-[11px] font-medium text-muted">
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-describedby="signup-password-hint"
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
          <p id="signup-password-hint" className="text-[10px] text-subtle">
            {PASSWORD_HINT}
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-medium text-muted">How did you hear about us? <span className="text-subtle">(optional)</span></span>
          <select
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value)}
            className={authFieldClass}
          >
            <option value="">Select an option</option>
            {LEAD_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

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
            {isSubmitting ? "Creating account…" : "Create account"}
          </MorphText>
        </button>
      </form>

      <p className="text-center text-xs text-subtle">
        Already have an account?{" "}
        <Link href="/login" className={authLinkClass}>
          Sign in
        </Link>
      </p>

      <p className="text-center text-[11px] text-subtle">
        Self-hosting?{" "}
        <a
          href="/downloads/memory404-extension.zip"
          download="memory404-extension.zip"
          className={authLinkClass}
        >
          Download the Chrome extension
        </a>{" "}
        and point App URL at your own server.
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
