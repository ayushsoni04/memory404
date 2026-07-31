import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import VaultInbox from "@/components/VaultInbox";
import { OPENED_GROUP_COOKIE } from "@/components/vault/types";
import { getInitialVaultData } from "@/lib/vault-initial-data";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: {
    absolute: "memory404 — saved links feed",
  },
  description:
    "Save links into groups and browse them like a dark inspiration feed.",
  alternates: {
    canonical: "/",
  },
};

function VaultFallback() {
  return (
    <div className="vault-shell mx-auto grid min-h-dvh w-full max-w-[var(--content-max)] grid-cols-1 gap-[var(--layout-gap-section)] px-[max(var(--layout-pad),env(safe-area-inset-left))] pe-[max(var(--layout-pad),env(safe-area-inset-right))] pt-[max(var(--layout-pad),env(safe-area-inset-top))] pb-[max(var(--layout-pad),env(safe-area-inset-bottom))] lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)] lg:gap-x-[var(--sidebar-content-gap)] lg:gap-y-0">
      <div className="hidden lg:block" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="pt-4">
          <div className="h-5 w-40 animate-pulse rounded bg-neutral-800/40" />
          <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-neutral-800/25" />
        </div>
        <div className="mind-grid mt-8" data-grid-size="large">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="mb-3 break-inside-avoid animate-pulse">
              <div className="rounded-[4px] border border-border/30 bg-surface-elevated p-[1px]">
                <div className="aspect-[16/10] w-full rounded-[4px] bg-neutral-800/30" />
              </div>
              <div className="mt-2 space-y-1 px-0.5">
                <div className="h-3.5 w-4/5 rounded bg-neutral-800/40" />
                <div className="h-3 w-2/5 rounded bg-neutral-800/25" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const cookieStore = await cookies();
  const initialData = await getInitialVaultData(
    cookieStore.get(OPENED_GROUP_COOKIE)?.value ?? "all",
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Suspense fallback={<VaultFallback />}>
        <VaultInbox initialData={initialData} />
      </Suspense>
    </div>
  );
}
