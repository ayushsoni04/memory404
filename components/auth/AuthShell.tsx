"use client";

type Props = {
  children: React.ReactNode;
};

/** Full-viewport auth layout over the page backdrop. */
export default function AuthShell({ children }: Props) {
  return (
    <div className="art-clear relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-background px-[max(var(--layout-pad),env(safe-area-inset-left))] pe-[max(var(--layout-pad),env(safe-area-inset-right))] pt-[max(var(--layout-pad),env(safe-area-inset-top))] pb-[max(var(--layout-pad),env(safe-area-inset-bottom))]">
      <div className="relative z-10 w-full max-w-[380px] rounded-xl border border-border bg-black p-6">
        {children}
      </div>
    </div>
  );
}
