"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import MorphText from "@/components/MorphText";
import { getPasswordRequirementIssues, PASSWORD_HINT } from "@/lib/password-policy";
import { LEAD_SOURCE_OPTIONS, readUtmFromSearchParams } from "@/lib/utm";

function safeRedirectPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }
  return raw;
}

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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create account");
      setIsSubmitting(false);
      return;
    }

    window.location.assign(redirectPath);
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
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition"
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-medium text-muted">Password</span>
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

        <label className="block space-y-1.5">
          <span className="text-[11px] font-medium text-muted">How did you hear about us? <span className="text-subtle">(optional)</span></span>
          <select
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition"
          >
            <option value="">Select an option</option>
            {LEAD_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || isSkipping}
          className="w-full h-9 bg-pill-active text-pill-active-fg text-xs font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
        >
          <MorphText duration={220}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </MorphText>
        </button>
      </form>

      <p className="text-center text-xs text-subtle">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:underline">
          Sign in
        </Link>
      </p>

      <button
        type="button"
        onClick={handleSkip}
        disabled={isSubmitting || isSkipping}
        className="w-full text-center text-[11px] text-subtle hover:text-foreground transition cursor-pointer disabled:opacity-50"
      >
        {isSkipping ? "Skipping…" : "Skip for now"}
      </button>
    </div>
  );
}
