"use client";

import { useEffect, useState } from "react";
import { AuthModal } from "./_components/AuthModal";
import type { BillingCycle, Plan, Tab } from "./_components/constants";
import { DeactivateModal } from "./_components/DeactivateModal";
import { MembershipTab } from "./_components/MembershipTab";
import { ProfileTab } from "./_components/ProfileTab";
import { SettingsNav } from "./_components/SettingsNav";
import { StatsTab } from "./_components/StatsTab";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile Form States
  const [name, setName] = useState("Ayush Soni");
  const [username, setUsername] = useState("ayushsoni04");
  const [email, setEmail] = useState("ayush@memory404.design");
  const [bannerStyle, setBannerStyle] = useState("midnight");
  const [isSaved, setIsSaved] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Billing States
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [currentPlan, setCurrentPlan] = useState<Plan>("pro");
  const [teamSeats, setTeamSeats] = useState(5); // Slider seat count

  // Account Deactivation Modal States
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateInput, setDeactivateInput] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivatedSuccess, setDeactivatedSuccess] = useState(false);

  // Mock Onboarding Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState(1); // 1 = Login, 2 = Role, 3 = Theme
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authRole, setAuthRole] = useState("designer");
  const [authTheme, setAuthTheme] = useState("midnight");
  const [authSuccess, setAuthSuccess] = useState(false);

  useEffect(() => {
    if (!showAuthModal && !showDeactivateModal) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setShowAuthModal(false);
      setShowDeactivateModal(false);
      setAuthStep(1);
      setDeactivateInput("");
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showAuthModal, showDeactivateModal]);

  // Load profile from localStorage. Runs post-mount (not a lazy initializer)
  // so server and first-client-render markup match; localStorage isn't
  // available during SSR.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("m404-profile-name");
      const storedUsername = localStorage.getItem("m404-profile-username");
      const storedEmail = localStorage.getItem("m404-profile-email");
      const storedPlan = localStorage.getItem("m404-billing-plan");
      const storedCycle = localStorage.getItem("m404-billing-cycle");
      const storedBanner = localStorage.getItem("m404-profile-banner");
      const storedSeats = localStorage.getItem("m404-billing-seats");
      const storedAvatar = localStorage.getItem("m404-profile-avatar");

      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedName) setName(storedName);
      if (storedUsername) setUsername(storedUsername);
      if (storedEmail) setEmail(storedEmail);
      if (storedPlan === "free" || storedPlan === "pro" || storedPlan === "team") {
        setCurrentPlan(storedPlan);
      }
      if (storedCycle === "monthly" || storedCycle === "yearly") {
        setBillingCycle(storedCycle);
      }
      if (storedBanner) setBannerStyle(storedBanner);
      if (storedSeats) setTeamSeats(Number(storedSeats));
      if (storedAvatar) setAvatarPreview(storedAvatar);
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("m404-profile-name", name);
    localStorage.setItem("m404-profile-username", username);
    localStorage.setItem("m404-profile-email", email);
    localStorage.setItem("m404-profile-banner", bannerStyle);
    if (avatarPreview) {
      localStorage.setItem("m404-profile-avatar", avatarPreview);
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handlePlanChange = (plan: Plan) => {
    setCurrentPlan(plan);
    localStorage.setItem("m404-billing-plan", plan);
  };

  const handleBillingCycleChange = (cycle: BillingCycle) => {
    setBillingCycle(cycle);
    localStorage.setItem("m404-billing-cycle", cycle);
  };

  const handleSeatsChange = (seats: number) => {
    setTeamSeats(seats);
    localStorage.setItem("m404-billing-seats", String(seats));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarPreview(base64String);
        localStorage.setItem("m404-profile-avatar", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeactivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (deactivateInput !== "deactivate") return;
    setIsDeactivating(true);
    setTimeout(() => {
      setIsDeactivating(false);
      setDeactivatedSuccess(true);
      localStorage.clear();
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }, 1500);
  };

  // Mock Onboarding submit
  const handleMockOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authStep === 1) {
      if (!authEmail || !authPassword) return;
      setAuthStep(2);
    } else if (authStep === 2) {
      setAuthStep(3);
    } else if (authStep === 3) {
      setAuthSuccess(true);
      // Save changes to workspace profile
      setName("Developer Account");
      setUsername(authEmail.split("@")[0] || "dev");
      setEmail(authEmail);
      setBannerStyle(authTheme);
      localStorage.setItem("m404-profile-name", "Developer Account");
      localStorage.setItem("m404-profile-username", authEmail.split("@")[0] || "dev");
      localStorage.setItem("m404-profile-email", authEmail);
      localStorage.setItem("m404-profile-banner", authTheme);

      setTimeout(() => {
        setShowAuthModal(false);
        setAuthSuccess(false);
        setAuthStep(1);
        setAuthEmail("");
        setAuthPassword("");
      }, 2000);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[var(--content-max)] flex-col gap-8 p-4 min-[1712px]:border-x min-[1712px]:border-border lg:flex-row">

      <SettingsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAuthModal={() => {
          setAuthStep(1);
          setShowAuthModal(true);
        }}
      />

      {/* Main Settings Panel */}
      <main className="flex min-w-0 flex-1 flex-col lg:ml-[252px]">
        <div className="max-w-[720px] space-y-8 pt-4 pb-12">

          {/* Header */}
          <header className="border-b border-border pb-5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground uppercase font-mono">
              {activeTab === "profile" && "Profile settings"}
              {activeTab === "membership" && "Membership details"}
              {activeTab === "statistics" && "Usage statistics"}
            </h1>
            <p className="mt-1 text-sm text-subtle">
              {activeTab === "profile" && "Manage your visual profile, banner choices, and local workspace credentials."}
              {activeTab === "membership" && "Configure pricing layers, run seat calculators, and download receipt histories."}
              {activeTab === "statistics" && "Track total saved links, group density distributions, and relative additions timelines."}
            </p>
          </header>

          {activeTab === "profile" && (
            <ProfileTab
              name={name}
              setName={setName}
              username={username}
              setUsername={setUsername}
              email={email}
              setEmail={setEmail}
              bannerStyle={bannerStyle}
              setBannerStyle={setBannerStyle}
              avatarPreview={avatarPreview}
              onAvatarChange={handleAvatarChange}
              isSaved={isSaved}
              onSaveProfile={handleSaveProfile}
              currentPlan={currentPlan}
              onOpenDeactivateModal={() => setShowDeactivateModal(true)}
            />
          )}

          {activeTab === "membership" && (
            <MembershipTab
              billingCycle={billingCycle}
              onBillingCycleChange={handleBillingCycleChange}
              currentPlan={currentPlan}
              onPlanChange={handlePlanChange}
              teamSeats={teamSeats}
              onSeatsChange={handleSeatsChange}
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
        }}
        deactivateInput={deactivateInput}
        setDeactivateInput={setDeactivateInput}
        isDeactivating={isDeactivating}
        deactivatedSuccess={deactivatedSuccess}
        onSubmit={handleDeactivate}
      />

      <AuthModal
        open={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthStep(1);
        }}
        authStep={authStep}
        setAuthStep={setAuthStep}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        authRole={authRole}
        setAuthRole={setAuthRole}
        authTheme={authTheme}
        setAuthTheme={setAuthTheme}
        authSuccess={authSuccess}
        onSubmit={handleMockOnboardingSubmit}
      />

    </div>
  );
}
