"use client";

/**
 * Lightweight text swap — CSS only (no framer-motion on the critical path).
 * Remounting on `key` retriggers the enter animation.
 */
export default function TextSwap({ children }: { children: string }) {
  return (
    <span key={children} className="t-text-swap t-text-swap-enter">
      {children}
    </span>
  );
}
