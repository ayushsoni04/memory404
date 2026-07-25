"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to sign in");
      setIsSubmitting(false);
      return;
    }

    router.push(redirectPath);
    router.refresh();
  };

  return (
    <div className="w-full max-w-[380px] space-y-6">
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
              autoComplete="current-password"
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
        </label>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[11px] text-subtle hover:text-foreground transition">
            Forgot password?
          </Link>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-9 bg-pill-active text-pill-active-fg text-xs font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-xs text-subtle">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-foreground hover:underline">
          Sign up
        </Link>
      </p>

      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/dev-skip", { method: "POST" });
            router.push(redirectPath);
            router.refresh();
          }}
          className="w-full text-center text-[11px] text-subtle hover:text-foreground transition cursor-pointer"
        >
          Skip (dev only)
        </button>
      )}
    </div>
  );
}
