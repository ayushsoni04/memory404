"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Surfaces `?error=` from the browser extension (omnibox / context save failures).
 */
export function ExtensionErrorBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!message) return;
    dismissRef.current?.focus();
  }, [message]);

  useEffect(() => {
    const raw = searchParams.get("error");
    if (!raw) return;
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      // keep raw
    }
    const text = decoded.trim() || "Extension save failed";
    const id = window.setTimeout(() => {
      setMessage(text);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("error");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 0);
    return () => window.clearTimeout(id);
  }, [searchParams, router, pathname]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[80] flex justify-center px-4 pt-3 pointer-events-none"
    >
      <div className="pointer-events-auto flex max-w-lg items-start gap-3 rounded-lg border border-danger/40 bg-surface px-3 py-2.5 shadow-lg shadow-black/40">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-danger">Extension error</p>
          <p className="mt-0.5 break-words text-[13px] text-foreground">{message}</p>
        </div>
        <button
          ref={dismissRef}
          type="button"
          onClick={() => setMessage(null)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-pill px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-pill-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_70%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:min-h-8"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
