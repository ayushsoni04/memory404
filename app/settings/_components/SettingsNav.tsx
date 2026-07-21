import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CreditCard, Lock, TrendingUp, User } from "lucide-react";
import type { Tab } from "./constants";

type SettingsNavProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenAuthModal: () => void;
};

export function SettingsNav({ activeTab, onTabChange, onOpenAuthModal }: SettingsNavProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-8 py-4 lg:fixed lg:left-[max(1rem,calc((100vw-var(--content-max))/2+1rem))] lg:top-0 lg:box-border lg:h-dvh lg:w-[var(--sidebar-w)] lg:justify-between">
      <div className="flex flex-col gap-6">
        {/* Logo link back to vault */}
        <Link href="/" aria-label="memory404" className="inline-flex items-center gap-2 text-foreground transition hover:opacity-85">
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
          <span className="font-mono text-sm tracking-widest font-semibold uppercase">404</span>
        </Link>

        {/* Sub Navigation tabs */}
        <nav className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
          <button
            onClick={() => onTabChange("profile")}
            className={`flex h-8 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150 ${
              activeTab === "profile" ? "bg-pill text-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-neutral-900/40"
            }`}
          >
            <User className="size-4" />
            Profile
          </button>
          <button
            onClick={() => onTabChange("membership")}
            className={`flex h-8 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150 ${
              activeTab === "membership" ? "bg-pill text-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-neutral-900/40"
            }`}
          >
            <CreditCard className="size-4" />
            Plan & billing
          </button>
          <button
            onClick={() => onTabChange("statistics")}
            className={`flex h-8 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150 ${
              activeTab === "statistics" ? "bg-pill text-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-neutral-900/40"
            }`}
          >
            <TrendingUp className="size-4" />
            Stats & activity
          </button>
        </nav>
      </div>

      {/* Global Footer Links & Login CTA */}
      <div className="flex flex-col gap-4">
        <button
          onClick={onOpenAuthModal}
          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-neutral-900/50 text-[11px] font-mono uppercase tracking-wider text-muted hover:bg-pill hover:text-foreground transition-[transform,background-color,color] duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97] py-2 px-3 text-center"
        >
          <Lock className="size-3.5 text-subtle" />
          Join / Mock Sign In
        </button>

        <div className="hidden flex-col gap-2 lg:flex">
          <Link href="/" className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            Back to feed
          </Link>
          <Link href="/workspace" className="text-[13px] text-muted transition-colors hover:text-foreground">
            Workspace
          </Link>
          <p className="text-[13px] text-subtle">
            © {new Date().getFullYear()} memory404
          </p>
        </div>
      </div>
    </aside>
  );
}
