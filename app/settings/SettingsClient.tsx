"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Plan, Tab } from "./_components/constants";
import { DeactivateModal } from "./_components/DeactivateModal";
import { MembershipTab } from "./_components/MembershipTab";
import { ProfileTab } from "./_components/ProfileTab";
import { SettingsNav } from "./_components/SettingsNav";
import { StatsTab } from "./_components/StatsTab";

type MeUser = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerStyle: string;
  plan: string;
};

function asPlan(value: string): Plan {
  if (value === "pro" || value === "team") return value;
  return "free";
}

export default function SettingsClient({ isOwner }: { isOwner: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bannerStyle, setBannerStyle] = useState("midnight");
  const [isSaved, setIsSaved] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateInput, setDeactivateInput] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivatedSuccess, setDeactivatedSuccess] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const applyUser = useCallback((user: MeUser) => {
    setName(user.name ?? "");
    setUsername(user.username ?? "");
    setEmail(user.email);
    setBannerStyle(user.bannerStyle || "midnight");
    setAvatarPreview(user.avatarUrl);
    setCurrentPlan(asPlan(user.plan));
  }, []);

  useEffect(() => {
    if (!showDeactivateModal) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setShowDeactivateModal(false);
      setDeactivateInput("");
      setDeactivateError(null);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showDeactivateModal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#extension") return;
    setActiveTab("profile");
    const timer = window.setTimeout(() => {
      document.getElementById("extension")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  const loadRequest = useRef(0);

  const loadProfile = useCallback(async () => {
    const requestId = ++loadRequest.current;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch("/api/me");
      const data = await res.json().catch(() => ({}));
      if (requestId !== loadRequest.current) return;
      if (!res.ok || !data.user) {
        const message =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "Failed to load profile";
        throw new Error(message);
      }
      applyUser(data.user as MeUser);
      setProfileReady(true);
    } catch (e) {
      if (requestId !== loadRequest.current) return;
      setProfileReady(false);
      setProfileError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      if (requestId === loadRequest.current) setProfileLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    void loadProfile();
    return () => {
      loadRequest.current += 1;
    };
  }, [loadProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          username: username.trim() || null,
          bannerStyle,
          avatarUrl: avatarPreview,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }
      if (data.user) applyUser(data.user as MeUser);
      window.dispatchEvent(new CustomEvent("m404:profile-updated"));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deactivateInput !== "deactivate") return;
    setDeactivateError(null);
    setIsDeactivating(true);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account");
      }
      setDeactivatedSuccess(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err) {
      setDeactivateError(
        err instanceof Error ? err.message : "Failed to delete account",
      );
      setIsDeactivating(false);
    }
  };

  return (
    <div className="vault-shell mx-auto grid min-h-dvh w-full max-w-[var(--content-max)] grid-cols-1 gap-[var(--layout-gap-section)] px-[max(var(--layout-pad),env(safe-area-inset-left))] pe-[max(var(--layout-pad),env(safe-area-inset-right))] pt-[max(var(--layout-pad),env(safe-area-inset-top))] pb-[max(var(--layout-pad),env(safe-area-inset-bottom))] lg:h-dvh lg:max-h-dvh lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)] lg:gap-x-0 lg:gap-y-0 lg:overflow-hidden lg:ps-0 lg:pe-[max(var(--layout-pad),env(safe-area-inset-right))] lg:pt-0 lg:pb-0 min-[1712px]:border-x min-[1712px]:border-border">

      <SettingsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOwner={isOwner}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="max-w-[720px] space-y-8 pt-4 pb-12">
          <header className="space-y-2 pb-5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground uppercase font-mono">
              {activeTab === "profile" && "Profile settings"}
              {activeTab === "membership" && "Membership details"}
              {activeTab === "statistics" && "Usage statistics"}
            </h1>
            <p className="text-sm text-subtle">
              {activeTab === "profile" &&
                "Manage your name, username, banner, and avatar. Changes sync to your account."}
              {activeTab === "membership" &&
                "Your current plan. Paid upgrades are coming soon."}
              {activeTab === "statistics" &&
                "Track total saved links, group density distributions, and relative additions timelines."}
            </p>
          </header>

          {activeTab === "profile" && (
            <ProfileTab
              name={name}
              setName={setName}
              username={username}
              setUsername={setUsername}
              email={email}
              bannerStyle={bannerStyle}
              setBannerStyle={setBannerStyle}
              avatarPreview={avatarPreview}
              onAvatarChange={handleAvatarChange}
              isSaved={isSaved}
              isSaving={isSaving}
              isLoading={profileLoading}
              profileReady={profileReady}
              error={profileError}
              onRetryLoad={() => void loadProfile()}
              onSaveProfile={handleSaveProfile}
              currentPlan={currentPlan}
              onOpenDeactivateModal={() => {
                setDeactivateError(null);
                setShowDeactivateModal(true);
              }}
            />
          )}

          {activeTab === "membership" && (
            <MembershipTab currentPlan={currentPlan} />
          )}

          {activeTab === "statistics" && <StatsTab bannerStyle={bannerStyle} />}
        </div>
      </main>

      <DeactivateModal
        open={showDeactivateModal}
        onClose={() => {
          setShowDeactivateModal(false);
          setDeactivateInput("");
          setDeactivateError(null);
        }}
        deactivateInput={deactivateInput}
        setDeactivateInput={setDeactivateInput}
        isDeactivating={isDeactivating}
        deactivatedSuccess={deactivatedSuccess}
        error={deactivateError}
        onSubmit={handleDeactivate}
      />
    </div>
  );
}
