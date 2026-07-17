import { useState } from "react";
import Image from "next/image";
import TextSwap from "@/components/TextSwap";
import { AppLoader } from "@/components/AppLoader";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  Sparkles,
} from "lucide-react";
import { BANNER_GRADIENTS, type Plan } from "./constants";

type ProfileTabProps = {
  name: string;
  setName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  bannerStyle: string;
  setBannerStyle: (value: string) => void;
  avatarPreview: string | null;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSaved: boolean;
  onSaveProfile: (e: React.FormEvent) => void;
  currentPlan: Plan;
  onOpenDeactivateModal: () => void;
};

export function ProfileTab({
  name,
  setName,
  username,
  setUsername,
  email,
  setEmail,
  bannerStyle,
  setBannerStyle,
  avatarPreview,
  onAvatarChange,
  isSaved,
  onSaveProfile,
  currentPlan,
  onOpenDeactivateModal,
}: ProfileTabProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Real backup downloader (paginated so it works with cursor-based /api/links)
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const allLinks: unknown[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 500; page += 1) {
        const params = new URLSearchParams({ limit: "100" });
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/links?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch links");
        const data = await res.json();
        const batch = Array.isArray(data.links) ? data.links : [];
        allLinks.push(...batch);
        if (!data.hasMore || !data.nextCursor) break;
        cursor = data.nextCursor as string;
      }

      // Download triggered client-side
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allLinks, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `memory404-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const currentGradient = BANNER_GRADIENTS.find((b) => b.id === bannerStyle) || BANNER_GRADIENTS[0];

  return (
    <form onSubmit={onSaveProfile} className="space-y-8">

      {/* Premium Mobbin/Figma Style Visual Banner Card */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg relative group/card">
        {/* Banner display */}
        <div className={`h-28 w-full ${currentGradient.class}`} />

        {/* User info overlapping banner */}
        <div className="relative px-6 pb-6 pt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          {/* Interactive Avatar Upload Container */}
          <label className="absolute -top-10 left-6 flex size-20 cursor-pointer items-center justify-center rounded-full bg-neutral-900 border-2 border-surface shadow-xl select-none overflow-hidden group/avatar transition-colors duration-150 hover:border-muted">
            <input
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar Preview"
                fill
                unoptimized
                className="size-full object-cover transition duration-300 group-hover/avatar:brightness-50"
              />
            ) : (
              <span className="text-xl font-semibold tracking-wider text-muted font-mono uppercase transition duration-300 group-hover/avatar:brightness-50">
                {name ? name.split(" ").map((w) => w[0]).join("") : "M"}
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover/avatar:opacity-100 bg-black/40">
              <Camera className="size-5 text-white" />
            </div>
          </label>

          <div className="pt-2 sm:pt-0">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
              {name || "Ayush Soni"}
            </h3>
            <p className="text-xs text-subtle font-mono mt-0.5">@{username || "ayushsoni04"}</p>
          </div>
          <div className="text-[11px] text-muted font-mono border border-border rounded px-2.5 py-1 bg-surface-elevated self-start sm:self-auto uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="size-3 text-yellow-500 animate-pulse" />
            {currentPlan} membership
          </div>
        </div>
      </div>

      {/* Accent Banner Selector */}
      <section className="space-y-3">
        <h3 className="text-xs font-mono tracking-wider text-subtle uppercase flex items-center gap-1.5">
          Profile banner theme
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BANNER_GRADIENTS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBannerStyle(b.id)}
              className={`relative flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-[transform,background-color,border-color] duration-[160ms] ease-[var(--ease-out)] ${
                bannerStyle === b.id ? "border-foreground bg-surface-elevated shadow-md scale-[1.02]" : "border-border bg-surface hover:border-neutral-700 hover:bg-surface-elevated/40"
              }`}
            >
              <div className={`h-8 w-full rounded-md ${b.class}`} />
              <span className="text-[11px] font-medium text-muted truncate mt-0.5">{b.label}</span>
              {bannerStyle === b.id && (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-foreground shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Input details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 group">
          <span className="text-xs font-medium text-muted transition group-focus-within:text-foreground">Full Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-[160ms] focus:border-foreground/40 focus:ring-2 focus:ring-foreground/5"
            placeholder="E.g. Ayush Soni"
            required
          />
        </label>
        <label className="block space-y-1.5 group">
          <span className="text-xs font-medium text-muted transition group-focus-within:text-foreground">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-[160ms] focus:border-foreground/40 focus:ring-2 focus:ring-foreground/5 font-mono"
            placeholder="ayushsoni04"
            required
          />
        </label>
        <label className="block space-y-1.5 sm:col-span-2 group">
          <span className="text-xs font-medium text-muted transition group-focus-within:text-foreground">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-[160ms] focus:border-foreground/40 focus:ring-2 focus:ring-foreground/5"
            placeholder="ayush@memory404.design"
            required
          />
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-pill-active px-4 text-sm font-medium text-pill-active-fg transition-[transform,opacity] duration-[160ms] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97] cursor-pointer shadow-md"
        >
          <TextSwap>
            {isSaved ? "Saved!" : "Save profile changes"}
          </TextSwap>
        </button>
        {isSaved && (
          <span className="inline-flex items-center gap-1.5 text-xs text-success font-mono">
            <CheckCircle2 className="size-4" />
            Profile updated!
          </span>
        )}
      </div>

      {/* Functional JSON Exporter Section */}
      <section className="border-t border-border pt-6 space-y-3">
        <div>
          <h3 className="text-xs font-mono tracking-wider text-subtle uppercase">Data archive</h3>
          <p className="text-xs text-subtle mt-0.5">Download a fully formatted JSON backup containing all your saved links and metadata.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-neutral-800 transition duration-300">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">Export link archives</p>
            <p className="text-[10px] text-subtle font-mono">Includes titles, custom tags, screenshots metadata, and dates.</p>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted hover:bg-pill hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? <AppLoader compact progressive label="exporting" /> : (
              <>
                <Download className="size-3.5" />
                Export backup JSON
              </>
            )}
          </button>
        </div>
      </section>

      {/* Danger Zone: Account Deactivation Modal */}
      <section className="border-t border-border pt-6 space-y-3">
        <h3 className="text-xs font-mono tracking-wider text-danger uppercase">Danger zone</h3>
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-danger flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              Permanently delete account
            </h4>
            <p className="text-[11px] text-subtle mt-0.5">This deletes your profile configuration, billing methods, and clean sweeps all database links.</p>
          </div>
          <button
            type="button"
            onClick={onOpenDeactivateModal}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-danger/10 border border-danger/25 hover:bg-danger/20 hover:border-danger/45 text-danger px-3 text-xs font-semibold transition cursor-pointer"
          >
            Delete account & data
          </button>
        </div>
      </section>

    </form>
  );
}
