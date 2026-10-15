import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import MorphText from "@/components/MorphText";
import { AppLoader } from "@/components/AppLoader";
import { ExtensionInstallCard } from "@/components/ExtensionInstallCard";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  getSoundsEnabled,
  playUiSound,
  setSoundsEnabled,
} from "@/lib/ui-sound";
import { controlPress } from "@/components/vault/types";
import { BANNER_GRADIENTS, nextBannerStyle } from "./constants";
import {
  getAvatarFileIssues,
  getNameIssues,
  getUsernameIssues,
} from "@/lib/profile";
import { PasswordSection } from "./PasswordSection";

const profileField =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-[160ms] focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_35%,transparent)]";

type ProfileTabProps = {
  name: string;
  setName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  email: string;
  bannerStyle: string;
  setBannerStyle: (value: string) => void;
  avatarPreview: string | null;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSaved: boolean;
  isSaving?: boolean;
  isLoading?: boolean;
  /** False until the saved profile has loaded. The form stays hidden so a retry cannot save blanks. */
  profileReady?: boolean;
  error?: string | null;
  onRetryLoad?: () => void;
  onSaveProfile: (e: React.FormEvent) => void;
  onOpenDeactivateModal: () => void;
};

export function ProfileTab({
  name,
  setName,
  username,
  setUsername,
  email,
  bannerStyle,
  setBannerStyle,
  avatarPreview,
  onAvatarChange,
  isSaved,
  isSaving = false,
  isLoading = false,
  profileReady = false,
  error = null,
  onRetryLoad,
  onSaveProfile,
  onOpenDeactivateModal,
}: ProfileTabProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [soundsOn, setSoundsOn] = useState(true);
  const nameIssues = getNameIssues(name);
  const usernameIssues =
    username.trim().length > 0 ? getUsernameIssues(username.trim()) : [];
  const fieldError = nameIssues[0] ?? (usernameIssues.length
    ? `Username must be: ${usernameIssues.join("; ")}`
    : null);

  useEffect(() => {
    setSoundsOn(getSoundsEnabled());
  }, []);

  // Real backup downloader (paginated so it works with cursor-based /api/links)
  const handleExportData = async () => {
    setExportError(null);
    setExportNotice(null);
    setIsExporting(true);
    try {
      const allLinks: unknown[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 500; page += 1) {
        const params = new URLSearchParams({ limit: "100" });
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/links?${params.toString()}`);
        if (!res.ok) throw new Error("Could not export your links");
        const data = await res.json();
        const batch = Array.isArray(data.links) ? data.links : [];
        allLinks.push(...batch);
        if (!data.hasMore || !data.nextCursor) break;
        cursor = data.nextCursor as string;
      }

      const filename = `memory404-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allLinks, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportNotice(`Downloaded ${filename}`);
    } catch {
      setExportError("Could not export your links. Try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const currentGradient = BANNER_GRADIENTS.find((b) => b.id === bannerStyle) || BANNER_GRADIENTS[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <AppLoader compact progressive label="loading profile" />
      </div>
    );
  }

  if (!profileReady) {
    return (
      <div
        className="flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-surface-elevated p-6"
        role="alert"
      >
        <p className="text-sm text-danger">{error || "Failed to load profile"}</p>
        <p className="text-[13px] text-subtle">
          Your name and username were not changed.
        </p>
        <button
          type="button"
          onClick={onRetryLoad}
          className="inline-flex h-8 items-center justify-center rounded-full bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg transition-[transform,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
    <form
      onSubmit={(event: FormEvent) => {
        if (fieldError || photoError) {
          event.preventDefault();
          return;
        }
        onSaveProfile(event);
      }}
      className="space-y-8"
    >
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {/* Premium Mobbin/Figma Style Visual Banner Card */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg relative group/card">
        {/* Banner display */}
        <div className={`h-28 w-full ${currentGradient.class}`} />

        {/* User info overlapping banner */}
        <div className="relative px-6 pb-6 pt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          {/* Interactive Avatar Upload Container */}
          <label className="group/avatar absolute -top-10 left-6 flex size-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-neutral-900 shadow-xl select-none transition-colors duration-150 hover:border-muted focus-within:ring-2 focus-within:ring-[color-mix(in_oklch,var(--focus)_45%,transparent)] focus-within:ring-offset-2 focus-within:ring-offset-surface">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const issues = getAvatarFileIssues(file);
                if (issues.length > 0) {
                  setPhotoError(issues[0]);
                  event.target.value = "";
                  return;
                }
                setPhotoError(null);
                onAvatarChange(event);
              }}
              aria-label="Change profile photo"
              aria-invalid={photoError ? true : undefined}
              aria-describedby={photoError ? "profile-photo-error" : undefined}
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition duration-300 group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-100">
              <Camera className="size-5 text-white" aria-hidden />
            </div>
          </label>

          <div className="pt-2 sm:pt-0">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
              {name || "Your name"}
            </h3>
            <p className="text-xs text-subtle font-mono mt-0.5">
              {username ? `@${username}` : "Set a username"}
            </p>
          </div>
        </div>
      </div>
      {photoError ? (
        <p id="profile-photo-error" className="px-1 text-[12px] text-danger" role="alert">
          {photoError}
        </p>
      ) : null}

      {/* Accent Banner Selector */}
      <section className="space-y-3">
        <h3 className="text-xs font-mono tracking-wider text-subtle uppercase flex items-center gap-1.5">
          Profile banner theme
        </h3>
        <div
          role="radiogroup"
          aria-label="Profile banner theme"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {BANNER_GRADIENTS.map((b) => {
            const selected = bannerStyle === b.id;
            return (
              <button
                key={b.id}
                id={`banner-${b.id}`}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setBannerStyle(b.id)}
                onKeyDown={(event) => {
                  const next = nextBannerStyle(bannerStyle, event.key);
                  if (!next) return;
                  event.preventDefault();
                  setBannerStyle(next);
                  document.getElementById(`banner-${next}`)?.focus();
                }}
                className={`relative flex flex-col gap-2 rounded-lg border p-2.5 text-left ${controlPress} ${
                  selected
                    ? "border-foreground bg-surface-elevated shadow-md scale-[1.02]"
                    : "border-border bg-surface hover:border-neutral-700 hover:bg-surface-elevated/40"
                }`}
              >
                <div className={`h-8 w-full rounded-md ${b.class}`} aria-hidden />
                <span className="mt-0.5 truncate text-[11px] font-medium text-muted">{b.label}</span>
                {selected ? (
                  <span
                    className="absolute top-2 right-2 size-2 rounded-full bg-foreground shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
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
            className={profileField}
            placeholder="Your name"
            autoComplete="name"
            aria-invalid={nameIssues.length > 0 ? true : undefined}
            aria-describedby={nameIssues.length > 0 ? "profile-name-error" : undefined}
          />
          {nameIssues.length > 0 ? (
            <span id="profile-name-error" className="block text-[12px] text-danger" role="alert">
              {nameIssues[0]}
            </span>
          ) : null}
        </label>
        <label className="block space-y-1.5 group">
          <span className="text-xs font-medium text-muted transition group-focus-within:text-foreground">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`${profileField} font-mono`}
            placeholder="your_handle"
            autoComplete="username"
            aria-invalid={usernameIssues.length > 0 ? true : undefined}
            aria-describedby={
              usernameIssues.length > 0 ? "profile-username-error" : undefined
            }
          />
          {usernameIssues.length > 0 ? (
            <span id="profile-username-error" className="block text-[12px] text-danger" role="alert">
              Username must be: {usernameIssues.join("; ")}
            </span>
          ) : null}
        </label>
        <label className="block space-y-1.5 sm:col-span-2 group">
          <span className="text-xs font-medium text-muted transition group-focus-within:text-foreground">Email address</span>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full rounded-lg border border-border bg-surface-elevated/50 px-3 py-2 text-sm text-muted outline-none cursor-default"
            autoComplete="email"
          />
          <span className="text-[10px] text-subtle">Email is set at signup and cannot be changed here.</span>
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving || Boolean(fieldError || photoError)}
          className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-pill-active px-4 text-sm font-medium text-pill-active-fg shadow-md hover:opacity-90 disabled:opacity-50 ${controlPress}`}
        >
          <MorphText>
            {isSaving ? "Saving…" : isSaved ? "Saved!" : "Save profile changes"}
          </MorphText>
        </button>
        {isSaved && (
          <span className="inline-flex items-center gap-1.5 text-xs text-success font-mono">
            <CheckCircle2 className="size-4" />
            Profile updated!
          </span>
        )}
      </div>
    </form>

      <PasswordSection />

      <ExtensionInstallCard variant="settings" />

      <section className="border-t border-border pt-6 space-y-3">
        <div>
          <h3 className="text-xs font-mono tracking-wider text-subtle uppercase">
            Sound feedback
          </h3>
          <p className="mt-0.5 text-xs text-subtle">
            Soft cues on save, copy, trash, and sorting. Your preference is saved on this device.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={soundsOn}
          onClick={() => {
            const next = !soundsOn;
            setSoundsOn(next);
            setSoundsEnabled(next);
            if (next) playUiSound("toggle");
          }}
          className={`flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 text-left hover:border-border-strong hover:bg-surface-elevated active:scale-[0.99] ${controlPress}`}
        >
          <span className="flex items-center gap-3">
            {soundsOn ? (
              <Volume2 className="size-4 text-foreground" strokeWidth={2} />
            ) : (
              <VolumeX className="size-4 text-muted" strokeWidth={2} />
            )}
            <span className="text-sm text-foreground">
              {soundsOn ? "Interface sounds on" : "Interface sounds off"}
            </span>
          </span>
          <span
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-[var(--duration-ui)] ${
              soundsOn ? "bg-pill-active" : "bg-pill"
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform duration-[var(--duration-ui)] ease-[var(--ease-out)] ${
                soundsOn ? "translate-x-[18px]" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </section>

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
            className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted hover:bg-pill hover:text-foreground disabled:opacity-50 ${controlPress}`}
          >
            {isExporting ? <AppLoader compact progressive label="exporting" /> : (
              <>
                <Download className="size-3.5" />
                Export backup JSON
              </>
            )}
          </button>
        </div>
        {exportError ? (
          <p className="text-[12px] text-danger" role="alert">
            {exportError}
          </p>
        ) : null}
        {exportNotice ? (
          <p className="text-[12px] text-success" role="status">
            {exportNotice}
          </p>
        ) : null}
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
            <p className="text-[11px] text-subtle mt-0.5">This deletes your profile and every saved link.</p>
          </div>
          <button
            type="button"
            onClick={onOpenDeactivateModal}
            className={`inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-danger/25 bg-danger/10 px-3 text-xs font-semibold text-danger hover:border-danger/45 hover:bg-danger/20 ${controlPress}`}
          >
            Delete account & data
          </button>
        </div>
      </section>

    </div>
  );
}
