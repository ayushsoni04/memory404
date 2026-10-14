import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import VaultInbox from "@/components/VaultInbox";
import ShortcutHelp from "@/components/vault/ShortcutHelp";
import { OPENED_GROUP_COOKIE } from "@/components/vault/types";
import { getAuthUser } from "@/lib/auth";
import { getMongoEnvError } from "@/lib/db/mongodb";
import { getIsOwner } from "@/lib/owner";
import { getSession } from "@/lib/session";
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
    <div className="vault-shell mx-auto grid min-h-dvh w-full max-w-[var(--content-max)] grid-cols-1 gap-[var(--layout-gap-section)] px-[max(var(--layout-pad),env(safe-area-inset-left))] pe-[max(var(--layout-pad),env(safe-area-inset-right))] pt-[max(var(--layout-pad),env(safe-area-inset-top))] pb-[max(var(--layout-pad),env(safe-area-inset-bottom))] lg:h-dvh lg:max-h-dvh lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)] lg:gap-x-0 lg:gap-y-0 lg:overflow-hidden lg:ps-0 lg:pe-[max(var(--layout-pad),env(safe-area-inset-right))] lg:pt-0 lg:pb-0">
      <div className="hidden lg:block" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="pt-4">
          <div className="h-5 w-40 animate-pulse rounded bg-neutral-800/40" />
        </div>
        <div className="mind-grid mt-8" data-grid-size="large">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="mind-card break-inside-avoid animate-pulse">
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
  const bypass =
    process.env.NODE_ENV !== "production" && process.env.AUTH_BYPASS === "1";
  if (!bypass && !getMongoEnvError()) {
    const session = await getSession();
    const user = session ? await getAuthUser() : null;
    if (session && !user) redirect("/login");
  }

  const cookieStore = await cookies();
  const [initialData, isOwner] = await Promise.all([
    getInitialVaultData(cookieStore.get(OPENED_GROUP_COOKIE)?.value ?? "all"),
    getIsOwner(),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Suspense fallback={<VaultFallback />}>
        <VaultInbox initialData={initialData} isOwner={isOwner} />
        <ShortcutHelp />
      </Suspense>
    </div>
  );
}
