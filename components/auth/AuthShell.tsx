"use client";

import AuthDitherBackground from "@/components/auth/AuthDitherBackground";

type Props = {
  children: React.ReactNode;
};

/** Full-viewport auth layout with idle dither background. */
export default function AuthShell({ children }: Props) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-background px-[max(var(--layout-pad),env(safe-area-inset-left))] pe-[max(var(--layout-pad),env(safe-area-inset-right))] pt-[max(var(--layout-pad),env(safe-area-inset-top))] pb-[max(var(--layout-pad),env(safe-area-inset-bottom))]">
      <AuthDitherBackground />
      <div className="relative z-10 w-full max-w-[380px] rounded-xl border border-border bg-black p-6">
        {children}
      </div>
    </div>
  );
}
