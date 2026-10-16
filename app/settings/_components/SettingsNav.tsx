"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, TrendingUp, User } from "lucide-react";
import GlitchText from "@/components/GlitchText";
import { controlPress } from "@/components/vault/types";
import { UNREACHABLE_MESSAGE } from "@/lib/load-error";
import { nextSettingsTab, type Tab } from "./constants";

export const SIGN_OUT_FAILED = "Couldn't sign out. Try again.";

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "statistics", label: "Stats & activity", icon: TrendingUp },
];

type SettingsNavProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isOwner?: boolean;
};

export function SettingsNav({
  activeTab,
  onTabChange,
  isOwner = false,
}: SettingsNavProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        setSignOutError(SIGN_OUT_FAILED);
        setSigningOut(false);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setSignOutError(UNREACHABLE_MESSAGE);
      setSigningOut(false);
    }
  };

  return (
    <aside className="vault-sidebar flex w-full shrink-0 flex-col gap-8 py-4 lg:sticky lg:top-0 lg:h-dvh lg:w-full lg:justify-between lg:self-start">
      <div className="flex flex-col gap-6">
        {/* Logo link back to vault */}
        <Link href="/" aria-label="memory404" className={`inline-flex items-center gap-2 rounded-lg text-foreground transition hover:opacity-85 ${controlPress}`}>
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className="size-7 object-contain"
            aria-hidden
            draggable={false}
            priority
          />
          <GlitchText className="text-sm tracking-widest font-semibold uppercase">
            404
          </GlitchText>
        </Link>

        {/* Sub Navigation tabs */}
        <nav className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1" aria-label="Settings">
          <div role="tablist" aria-label="Settings sections" className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
            {TABS.map((tab) => {
              const selected = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`settings-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`settings-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onTabChange(tab.id)}
                  onKeyDown={(event) => {
                    const next = nextSettingsTab(activeTab, event.key);
                    if (!next) return;
                    event.preventDefault();
                    onTabChange(next);
                    document.getElementById(`settings-tab-${next}`)?.focus();
                  }}
                  className={`flex h-8 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium ${controlPress} ${
                    selected ? "bg-pill text-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-neutral-900/40"
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Global Footer Links & Login CTA */}
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className={`flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-neutral-900/50 py-2 px-3 text-center text-[11px] font-mono uppercase tracking-wider text-muted hover:bg-pill hover:text-foreground disabled:opacity-60 ${controlPress}`}
        >
          <LogOut className="size-3.5 text-subtle" aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        {signOutError ? (
          <p className="text-[12px] text-danger" role="alert">
            {signOutError}
          </p>
        ) : null}

        <div className="hidden flex-col gap-2 lg:flex">
          <Link href="/" className={`inline-flex items-center gap-1 rounded-md text-[13px] text-muted transition-colors hover:text-foreground ${controlPress}`}>
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to feed
          </Link>
          {isOwner ? (
            <Link href="/workspace" className={`rounded-md text-[13px] text-muted transition-colors hover:text-foreground ${controlPress}`}>
              Workspace
            </Link>
          ) : null}
          <p className="text-[13px] text-subtle">
            © {new Date().getFullYear()} memory404
          </p>
        </div>
      </div>
    </aside>
  );
}
