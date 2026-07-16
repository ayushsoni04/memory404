"use client";

import dynamic from "next/dynamic";

const VaultInbox = dynamic(() => import("@/components/VaultInbox"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <VaultInbox />
    </div>
  );
}
