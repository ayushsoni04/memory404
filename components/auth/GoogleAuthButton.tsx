"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authGoogleClass } from "@/components/auth/auth-field";
import { googleAuthStartUrl } from "@/lib/google-oauth-url";

type Props = {
  label?: string;
};

function GoogleMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.7 0 2.9.7 3.6 1.4l2.4-2.4C16.5 3.7 14.4 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.2-1.5H12z"
      />
      <path
        fill="#34A853"
        d="M3.9 7.4 6.9 9.6C7.7 7.6 9.7 6.2 12 6.2c1.7 0 2.9.7 3.6 1.4l2.4-2.4C16.5 3.7 14.4 2.8 12 2.8 8.4 2.8 5.3 4.8 3.9 7.4z"
      />
      <path
        fill="#4A90E2"
        d="M12 21.2c2.3 0 4.3-.8 5.7-2.1l-2.8-2.2c-.8.5-1.8.9-2.9.9-2.3 0-4.3-1.6-5-3.7l-3 2.3C5.4 19.1 8.4 21.2 12 21.2z"
      />
      <path
        fill="#FBBC05"
        d="M6.9 14.1c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7L3.9 8.4C3.3 9.5 3 10.7 3 12s.3 2.5.9 3.6l3-1.5z"
      />
    </svg>
  );
}

/** Navigates into the server OAuth start route (cookie + PKCE). */
export function GoogleAuthButton({
  label = "Continue with Google",
}: Props) {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);

  return (
    <a
      href={googleAuthStartUrl("web", searchParams.get("redirect"))}
      className={authGoogleClass}
      aria-disabled={pending || undefined}
      onClick={() => setPending(true)}
    >
      <GoogleMark />
      <span>{pending ? "Opening Google…" : label}</span>
    </a>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] uppercase tracking-wide text-subtle">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
