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
import { CounterTest } from "./CounterTest";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Counter test",
  description: "The real library with a switch for the hero link counter",
  robots: { index: false },
};

/** The home page, with a floating switch for the hero counter. */
export default async function TestPage() {
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
    <div className="art-clear flex min-h-full flex-1 flex-col bg-background">
      <Suspense fallback={null}>
        <CounterTest>
          <VaultInbox initialData={initialData} isOwner={isOwner} />
        </CounterTest>
        <ShortcutHelp />
      </Suspense>
    </div>
  );
}
