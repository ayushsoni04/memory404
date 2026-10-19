"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isDeactivateConfirmation } from "@/lib/deactivate-confirm";
import { STATS_INTRO } from "@/lib/stats-scope";
import { explainLoadError, SESSION_EXPIRED_MESSAGE } from "@/lib/load-error";
import { settingsTabHref, type Tab } from "./_components/constants";
import { DeactivateModal } from "./_components/DeactivateModal";
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
};

const TAB_COPY: Record<Tab, { title: string; body: string }> = {
  profile: {
    title: "Profile settings",
    body: "Manage your name, username, banner, and avatar. Changes sync to your account.",
  },
  statistics: {
    title: "Usage statistics",
    body: STATS_INTRO,
  },
};

export default function SettingsClient({
  isOwner,
  initialTab = "profile",
}: {
  isOwner: boolean;
  initialTab?: Tab;
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    if (typeof window === "undefined") return;
    const next = settingsTabHref(window.location.href, tab);
    const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== here) window.history.replaceState(window.history.state, "", next);
  };
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
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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
      setProfileError(
        explainLoadError(e instanceof Error ? e.message : "Failed to load profile") ??
          "Failed to load profile",
      );
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

  const dismissProfileError = () => {
    setProfileError((current) =>
      current === SESSION_EXPIRED_MESSAGE ? current : null,
    );
  };

  const changeName = (value: string) => {
    dismissProfileError();
    setName(value);
  };

  const changeUsername = (value: string) => {
    dismissProfileError();
    setUsername(value);
  };

  const changeBannerStyle = (value: string) => {
    dismissProfileError();
    setBannerStyle(value);
  };

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
        const raw =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "Failed to save profile";
        throw new Error(raw);
      }
      if (data.user) applyUser(data.user as MeUser);
      window.dispatchEvent(new CustomEvent("m404:profile-updated"));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setProfileError(explainLoadError(message) ?? "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    dismissProfileError();
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDeactivateConfirmation(deactivateInput)) return;
    setDeactivateError(null);
    setIsDeactivating(true);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const raw =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "Failed to delete account";
        throw new Error(raw);
      }
      setDeactivatedSuccess(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete account";
      setDeactivateError(explainLoadError(message) ?? "Failed to delete account");
      setIsDeactivating(false);
    }
  };

  return (
    <div className="vault-shell mx-auto grid min-h-dvh w-full max-w-[var(--content-max)] grid-cols-1 gap-[var(--layout-gap-section)] px-[max(var(--layout-pad),env(safe-area-inset-left))] pe-[max(var(--layout-pad),env(safe-area-inset-right))] pt-[max(var(--layout-pad),env(safe-area-inset-top))] pb-[max(var(--layout-pad),env(safe-area-inset-bottom))] lg:h-dvh lg:max-h-dvh lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)] lg:gap-x-0 lg:gap-y-0 lg:overflow-hidden lg:ps-0 lg:pe-[max(var(--layout-pad),env(safe-area-inset-right))] lg:pt-0 lg:pb-0 min-[1712px]:border-x min-[1712px]:border-border">

      <SettingsNav
        activeTab={activeTab}
        onTabChange={selectTab}
        isOwner={isOwner}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:thin]">
        <div
          role="tabpanel"
          id={`settings-panel-${activeTab}`}
          aria-labelledby={`settings-tab-${activeTab}`}
          className="max-w-[720px] space-y-8 pt-4 pb-12"
        >
          <header className="space-y-2 pb-5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground uppercase font-mono">
              {TAB_COPY[activeTab].title}
            </h1>
            <p className="text-sm text-subtle">{TAB_COPY[activeTab].body}</p>
          </header>

          {activeTab === "profile" && (
            <ProfileTab
              name={name}
              setName={changeName}
              username={username}
              setUsername={changeUsername}
              email={email}
              bannerStyle={bannerStyle}
              setBannerStyle={changeBannerStyle}
              avatarPreview={avatarPreview}
              onAvatarChange={handleAvatarChange}
              isSaved={isSaved}
              isSaving={isSaving}
              isLoading={profileLoading}
              profileReady={profileReady}
              error={profileError}
              onRetryLoad={() => void loadProfile()}
              onSaveProfile={handleSaveProfile}
              onOpenDeactivateModal={() => {
                setDeactivateError(null);
                setShowDeactivateModal(true);
              }}
            />
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
