"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Download,
  FolderKanban,
  TrendingUp,
  User,
  Sliders,
  AlertTriangle,
  Users,
  Camera,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Info,
  Lock,
  Settings,
} from "lucide-react";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);
import { AppLoader } from "@/components/AppLoader";

type Tab = "profile" | "membership" | "statistics";

type GroupStat = {
  id: string;
  name: string;
  count: number;
};

type FrequencyStat = {
  date: string;
  count: number;
};

const BANNER_GRADIENTS = [
  { id: "midnight", label: "Midnight Onyx", class: "bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-border" },
  { id: "aurora", label: "Aurora Teal", class: "bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-b border-emerald-900/30" },
  { id: "twilight", label: "Twilight Violet", class: "bg-gradient-to-r from-indigo-950 via-rose-950 to-indigo-950 border-b border-rose-950/30" },
  { id: "ocean", label: "Deep Ocean", class: "bg-gradient-to-r from-sky-950 via-blue-900 to-sky-950 border-b border-blue-900/30" },
];

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
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [currentPlan, setCurrentPlan] = useState<"free" | "pro" | "team">("pro");
  const [teamSeats, setTeamSeats] = useState(5); // Slider seat count

  // Stats States
  const [totalLinks, setTotalLinks] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [linksByGroup, setLinksByGroup] = useState<GroupStat[]>([]);
  const [linkFrequency, setLinkFrequency] = useState<FrequencyStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Action States
  const [isExporting, setIsExporting] = useState(false);
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

  // Load profile from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("m404-profile-name");
      const storedUsername = localStorage.getItem("m404-profile-username");
      const storedEmail = localStorage.getItem("m404-profile-email");
      const storedPlan = localStorage.getItem("m404-billing-plan") as any;
      const storedCycle = localStorage.getItem("m404-billing-cycle") as any;
      const storedBanner = localStorage.getItem("m404-profile-banner");
      const storedSeats = localStorage.getItem("m404-billing-seats");
      const storedAvatar = localStorage.getItem("m404-profile-avatar");

      if (storedName) setName(storedName);
      if (storedUsername) setUsername(storedUsername);
      if (storedEmail) setEmail(storedEmail);
      if (storedPlan) setCurrentPlan(storedPlan);
      if (storedCycle) setBillingCycle(storedCycle);
      if (storedBanner) setBannerStyle(storedBanner);
      if (storedSeats) setTeamSeats(Number(storedSeats));
      if (storedAvatar) setAvatarPreview(storedAvatar);
    }
  }, []);

  // Fetch dynamic stats from database API
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTotalLinks(data.totalLinks);
            setTotalGroups(data.totalGroups);
            setLinksByGroup(data.linksByGroup);
            setLinkFrequency(data.linkFrequency);
          }
        }
      } catch (err) {
        console.error("Failed to load statistics", err);
      } finally {
        setLoadingStats(false);
      }
    }
    void fetchStats();
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

  const handlePlanChange = (plan: "free" | "pro" | "team") => {
    setCurrentPlan(plan);
    localStorage.setItem("m404-billing-plan", plan);
  };

  const handleSeatsChange = (seats: number) => {
    setTeamSeats(seats);
    localStorage.setItem("m404-billing-seats", String(seats));
  };

  const toggleBillingCycle = () => {
    const next = billingCycle === "monthly" ? "yearly" : "monthly";
    setBillingCycle(next);
    localStorage.setItem("m404-billing-cycle", next);
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

  // Real backup downloader
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const res = await fetch("/api/links");
      if (!res.ok) throw new Error("Failed to fetch links");
      const data = await res.json();
      const links = data.links || [];

      // Download triggered client-side
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(links, null, 2));
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

  // Helper to build 6-month contribution grid data
  const renderContributionGrid = () => {
    const today = new Date();
    const columns = 26; // 26 weeks
    const daysPerWeek = 7;
    const totalDays = columns * daysPerWeek;

    const startDate = new Date();
    startDate.setDate(today.getDate() - totalDays + 1);

    // Group frequency array into quick access map
    const freqMap = new Map<string, number>();
    linkFrequency.forEach((f) => freqMap.set(f.date, f.count));

    const gridCells = [];
    const dateCursor = new Date(startDate);

    for (let i = 0; i < totalDays; i++) {
      const dateStr = dateCursor.toISOString().slice(0, 10);
      const count = freqMap.get(dateStr) || 0;

      // Determine dot intensity level
      let colorClass = "bg-neutral-800/40 border border-neutral-900/30"; // 0 links
      let glowStyle = {};

      if (count === 1) {
        colorClass = "bg-neutral-700/80 border border-neutral-600/50";
      } else if (count === 2 || count === 3) {
        colorClass = "bg-neutral-500 border border-neutral-400/50";
      } else if (count >= 4) {
        colorClass = "bg-neutral-100 border border-white";
        // High density glow effect matching dot matrix style
        glowStyle = {
          boxShadow: "0 0 8px rgba(255, 255, 255, 0.6)",
        };
      }

      const label = `${count} link${count === 1 ? "" : "s"} added on ${new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

      gridCells.push(
        <div
          key={dateStr}
          title={label}
          style={glowStyle}
          className={`size-2.5 rounded-sm transition-all duration-300 hover:scale-125 cursor-pointer ${colorClass}`}
        />
      );

      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {gridCells}
        </div>
        <div className="flex items-center justify-between text-[11px] text-subtle font-mono">
          <span>{startDate.toLocaleDateString(undefined, { month: "short", year: "2-digit" })}</span>
          <div className="flex items-center gap-1.5">
            <span>Less</span>
            <div className="size-2 rounded-sm bg-neutral-800/60" />
            <div className="size-2 rounded-sm bg-neutral-600/90" />
            <div className="size-2 rounded-sm bg-neutral-400" />
            <div className="size-2 rounded-sm bg-neutral-100 shadow-[0_0_4px_rgba(255,255,255,0.7)]" />
            <span>More</span>
          </div>
          <span>Today</span>
        </div>
      </div>
    );
  };

  const pricing = {
    free: { monthly: 0, yearly: 0 },
    pro: { monthly: 15, yearly: 12 },
    team: { monthly: 29, yearly: 24 },
  };

  const currentGradient = BANNER_GRADIENTS.find(b => b.id === bannerStyle) || BANNER_GRADIENTS[0];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[var(--content-max)] flex-col gap-8 p-4 min-[1712px]:border-x min-[1712px]:border-border lg:flex-row">
      
      {/* Settings Navigation Sidebar */}
      <aside className="flex w-full shrink-0 flex-col gap-8 py-4 lg:fixed lg:left-[max(1rem,calc((100vw-var(--content-max))/2+1rem))] lg:top-0 lg:box-border lg:h-dvh lg:w-[var(--sidebar-w)] lg:justify-between">
        <div className="flex flex-col gap-6">
          {/* Logo link back to vault */}
          <Link href="/" aria-label="memory404" className="inline-flex items-center gap-2 text-foreground transition hover:opacity-85">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M0 0.38C0 0.17 0.17 0 0.38 0H22c5.52 0 10 4.48 10 10s-4.48 10-10 10H0V0.38Z" fill="currentColor" />
              <rect y="20" width="32" height="12" fill="currentColor" />
            </svg>
            <span className="font-mono text-sm tracking-widest font-semibold uppercase">Memory404</span>
          </Link>

          {/* Sub Navigation tabs */}
          <nav className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex h-8 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-all duration-200 ${
                activeTab === "profile" ? "bg-pill text-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-neutral-900/40"
              }`}
            >
              <User className="size-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab("membership")}
              className={`flex h-8 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-all duration-200 ${
                activeTab === "membership" ? "bg-pill text-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-neutral-900/40"
              }`}
            >
              <CreditCard className="size-4" />
              Plan & billing
            </button>
            <button
              onClick={() => setActiveTab("statistics")}
              className={`flex h-8 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-all duration-200 ${
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
            onClick={() => {
              setAuthStep(1);
              setShowAuthModal(true);
            }}
            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-neutral-900/50 text-[11px] font-mono uppercase tracking-wider text-muted hover:bg-pill hover:text-foreground transition-all duration-200 active:scale-95 py-2 px-3 text-center"
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
              Screen studio
            </Link>
            <p className="text-[13px] text-subtle">
              © {new Date().getFullYear()} memory404
            </p>
          </div>
        </div>
      </aside>

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

          {/* tab 1: Profile */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-8">
              
              {/* Premium Mobbin/Figma Style Visual Banner Card */}
              <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg relative group/card">
                {/* Banner display */}
                <div className={`h-28 w-full transition-all duration-500 ${currentGradient.class}`} />
                
                {/* User info overlapping banner */}
                <div className="relative px-6 pb-6 pt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  {/* Interactive Avatar Upload Container */}
                  <label className="absolute -top-10 left-6 flex size-20 cursor-pointer items-center justify-center rounded-full bg-neutral-900 border-2 border-surface shadow-xl select-none overflow-hidden group/avatar transition-all duration-300 hover:border-muted">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar Preview"
                        className="size-full object-cover transition duration-300 group-hover/avatar:brightness-50"
                      />
                    ) : (
                      <span className="text-xl font-semibold tracking-wider text-muted font-mono uppercase transition duration-300 group-hover/avatar:brightness-50">
                        {name ? name.split(" ").map(w => w[0]).join("") : "M"}
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
                      className={`relative flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-all duration-300 ${
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
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-all duration-300 focus:border-foreground/40 focus:ring-2 focus:ring-foreground/5"
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
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-all duration-300 focus:border-foreground/40 focus:ring-2 focus:ring-foreground/5 font-mono"
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
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-all duration-300 focus:border-foreground/40 focus:ring-2 focus:ring-foreground/5"
                    placeholder="ayush@memory404.design"
                    required
                  />
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-pill-active px-4 text-sm font-medium text-pill-active-fg transition-all duration-200 hover:opacity-90 active:scale-95 cursor-pointer shadow-md"
                >
                  Save profile changes
                </button>
                {isSaved && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-success animate-fade-in font-mono">
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
                    onClick={() => setShowDeactivateModal(true)}
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-danger/10 border border-danger/25 hover:bg-danger/20 hover:border-danger/45 text-danger px-3 text-xs font-semibold transition cursor-pointer"
                  >
                    Delete account & data
                  </button>
                </div>
              </section>

            </form>
          )}

          {/* tab 2: Membership (Plan & Billing) */}
          {activeTab === "membership" && (
            <div className="space-y-8">
              
              {/* Billing Cycle Selector - Calendly/Plain Inspired Switcher */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Billing interval</h3>
                  <p className="text-xs text-subtle mt-0.5">Toggle billing cycle. Save 20% on yearly plans.</p>
                </div>
                <div className="flex items-center gap-1 bg-pill p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setBillingCycle("monthly");
                      localStorage.setItem("m404-billing-cycle", "monthly");
                    }}
                    className={`h-7 items-center justify-center rounded-md px-3 text-xs font-medium transition-all duration-200 uppercase font-mono ${
                      billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingCycle("yearly");
                      localStorage.setItem("m404-billing-cycle", "yearly");
                    }}
                    className={`h-7 items-center justify-center rounded-md px-3 text-xs font-medium transition-all duration-200 uppercase font-mono relative ${
                      billingCycle === "yearly" ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
                    }`}
                  >
                    Yearly
                    <span className="absolute -top-1.5 -right-1 px-1 py-0.25 text-[7px] font-bold bg-success text-black rounded font-sans scale-85">
                      -20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Pricing Cards Grid (Plain & Calendly Inspired) */}
              <div className="grid gap-4 md:grid-cols-3">
                
                {/* Plan: Free */}
                <div
                  onClick={() => handlePlanChange("free")}
                  className={`relative cursor-pointer rounded-xl border p-5 transition-all duration-300 flex flex-col justify-between ${
                    currentPlan === "free" ? "border-foreground bg-surface-elevated shadow-xl scale-[1.02]" : "border-border bg-surface hover:border-neutral-700"
                  }`}
                >
                  <div>
                    {currentPlan === "free" && (
                      <span className="absolute top-3 right-3 rounded-full bg-foreground p-0.5 text-background shadow-[0_0_8px_rgba(255,255,255,0.7)]">
                        <Check className="size-3" />
                      </span>
                    )}
                    <h4 className="text-xs font-semibold tracking-wider text-muted font-mono uppercase">Free</h4>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight text-foreground">${pricing.free[billingCycle]}</span>
                      <span className="text-xs text-subtle font-mono">/mo</span>
                    </div>
                    <ul className="mt-5 space-y-2.5 text-[11px] text-muted">
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>Up to 50 links</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>Standard capture</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>Basic metadata</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Plan: Pro */}
                <div
                  onClick={() => handlePlanChange("pro")}
                  className={`relative cursor-pointer rounded-xl border p-5 transition-all duration-300 flex flex-col justify-between ${
                    currentPlan === "pro" ? "border-foreground bg-surface-elevated shadow-xl scale-[1.02] ring-1 ring-foreground/20" : "border-border bg-surface hover:border-neutral-700"
                  }`}
                >
                  <div>
                    {currentPlan === "pro" && (
                      <span className="absolute top-3 right-3 rounded-full bg-foreground p-0.5 text-background shadow-[0_0_8px_rgba(255,255,255,0.7)]">
                        <Check className="size-3" />
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-semibold tracking-wider text-foreground font-mono uppercase">Pro</h4>
                      <span className="rounded bg-foreground text-background px-1.5 py-0.5 text-[7px] tracking-wider uppercase font-mono font-bold animate-pulse">Popular</span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight text-foreground">${pricing.pro[billingCycle]}</span>
                      <span className="text-xs text-subtle font-mono">/mo</span>
                    </div>
                    <ul className="mt-5 space-y-2.5 text-[11px] text-muted">
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>Unlimited links</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>Premium screenshots</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>Custom workspace grids</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>Fast background enrich</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Plan: Team */}
                <div
                  onClick={() => handlePlanChange("team")}
                  className={`relative cursor-pointer rounded-xl border p-5 transition-all duration-300 flex flex-col justify-between ${
                    currentPlan === "team" ? "border-foreground bg-surface-elevated shadow-xl scale-[1.02]" : "border-border bg-surface hover:border-neutral-700"
                  }`}
                >
                  <div>
                    {currentPlan === "team" && (
                      <span className="absolute top-3 right-3 rounded-full bg-foreground p-0.5 text-background shadow-[0_0_8px_rgba(255,255,255,0.7)]">
                        <Check className="size-3" />
                      </span>
                    )}
                    <h4 className="text-xs font-semibold tracking-wider text-muted font-mono uppercase">Team</h4>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight text-foreground">
                        ${pricing.team[billingCycle] * teamSeats}
                      </span>
                      <span className="text-xs text-subtle font-mono">/mo</span>
                    </div>
                    <ul className="mt-5 space-y-2.5 text-[11px] text-muted">
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>{teamSeats} active user seats</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>Shared workspace boards</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>Priority queue enrichment</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-success shrink-0" />
                        <span>Direct API token access</span>
                      </li>
                    </ul>
                  </div>
                </div>

              </div>

              {/* Dynamic Interactive Seats Slider (Maze Inspired Seat Selection) */}
              {currentPlan === "team" && (
                <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-inner hover:border-neutral-800 transition duration-300">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="size-4 text-muted" />
                      Workspace seats configuration
                    </span>
                    <span className="font-mono text-xs text-foreground bg-pill px-2.5 py-0.5 rounded-full border border-border/40 tabular-nums">
                      {teamSeats} members
                    </span>
                  </div>
                  
                  {/* Slider Control Container */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="2"
                      max="100"
                      value={teamSeats}
                      onChange={(e) => handleSeatsChange(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-pill accent-foreground hover:bg-neutral-800 transition"
                    />
                    <div className="flex justify-between text-[9px] text-subtle font-mono uppercase">
                      <span>2 Seats</span>
                      <span>50 Seats</span>
                      <span>100 Seats</span>
                    </div>
                  </div>
                  
                  {/* Pricing Estimator breakdown */}
                  <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-2">
                    <span className="text-muted flex items-center gap-1">
                      <Info className="size-3 text-subtle" />
                      Billed {billingCycle === "yearly" ? "annually" : "monthly"} at standard rate:
                    </span>
                    <span className="font-semibold text-foreground font-mono tabular-nums flex items-baseline gap-1 bg-surface-elevated border border-border/30 rounded px-2.5 py-1">
                      ${billingCycle === "yearly" ? pricing.team.yearly * teamSeats * 12 : pricing.team.monthly * teamSeats * 1}.00
                      <span className="text-[9px] font-normal text-subtle font-sans">/ {billingCycle === "yearly" ? "yr" : "mo"}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Details Section */}
              <section className="space-y-3">
                <h3 className="text-xs font-mono tracking-wider text-subtle uppercase">Payment details</h3>
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 hover:border-neutral-800 transition duration-300">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-12 items-center justify-center rounded bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-muted font-mono tracking-widest uppercase">
                      VISA
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Visa ending in 4242</p>
                      <p className="text-[10px] text-subtle mt-0.5 font-mono">Expires 12/28 · Billed dynamically</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-xs font-medium text-muted hover:bg-pill hover:text-foreground transition-colors cursor-pointer"
                  >
                    Update card
                  </button>
                </div>
              </section>

              {/* Invoices List */}
              <section className="space-y-3">
                <h3 className="text-xs font-mono tracking-wider text-subtle uppercase">Billing History</h3>
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-neutral-900/30 text-subtle font-mono text-[10px] uppercase">
                          <th className="p-3 font-medium">Date</th>
                          <th className="p-3 font-medium">Invoice ID</th>
                          <th className="p-3 font-medium">Amount</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {[
                          { date: "Jul 1, 2026", id: "INV-004", amount: currentPlan === "team" ? `$${pricing.team[billingCycle] * teamSeats}.00` : currentPlan === "pro" ? `$${pricing.pro[billingCycle]}.00` : "$0.00", status: "Paid" },
                          { date: "Jun 1, 2026", id: "INV-003", amount: currentPlan === "team" ? `$${pricing.team[billingCycle] * teamSeats}.00` : currentPlan === "pro" ? `$${pricing.pro[billingCycle]}.00` : "$0.00", status: "Paid" },
                          { date: "May 1, 2026", id: "INV-002", amount: currentPlan === "team" ? `$${pricing.team[billingCycle] * teamSeats}.00` : currentPlan === "pro" ? `$${pricing.pro[billingCycle]}.00` : "$0.00", status: "Paid" },
                          { date: "Apr 1, 2026", id: "INV-001", amount: "$12.00", status: "Paid" },
                        ].map((inv) => (
                          <tr key={inv.id} className="text-muted hover:bg-neutral-900/25 transition duration-155">
                            <td className="p-3 whitespace-nowrap">{inv.date}</td>
                            <td className="p-3 font-mono">{inv.id}</td>
                            <td className="p-3 tabular-nums font-mono">{inv.amount}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 rounded bg-neutral-900 border border-neutral-800/80 px-1.5 py-0.5 text-[9px] text-success font-medium uppercase font-mono tracking-wide">
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                title="Download PDF"
                                className="inline-flex size-7 items-center justify-center rounded-lg text-subtle hover:bg-pill hover:text-foreground transition-colors cursor-pointer"
                              >
                                <Download className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

            </div>
          )}

          {/* tab 3: Statistics Dashboard */}
          {activeTab === "statistics" && (
            <div className="space-y-8">
              
              {/* Counters (Supabase Inspired Glassmorphism) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface p-5 hover:border-neutral-700 hover:shadow-[0_0_15px_rgba(255,255,255,0.02)] transition duration-300 group">
                  <div className="flex items-center justify-between text-subtle">
                    <span className="text-xs font-mono tracking-wider uppercase group-hover:text-foreground transition">Saved links</span>
                    <TrendingUp className="size-4 text-success" />
                  </div>
                  {loadingStats ? (
                    <div className="mt-3 h-8 w-20 animate-pulse bg-pill rounded" />
                  ) : (
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums font-mono">{totalLinks}</p>
                  )}
                  <p className="mt-1.5 text-xs text-subtle">Total links saved across all workspace categories.</p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-5 hover:border-neutral-700 hover:shadow-[0_0_15px_rgba(255,255,255,0.02)] transition duration-300 group">
                  <div className="flex items-center justify-between text-subtle">
                    <span className="text-xs font-mono tracking-wider uppercase group-hover:text-foreground transition">Total groups</span>
                    <FolderKanban className="size-4 text-muted" />
                  </div>
                  {loadingStats ? (
                    <div className="mt-3 h-8 w-20 animate-pulse bg-pill rounded" />
                  ) : (
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums font-mono">{totalGroups}</p>
                  )}
                  <p className="mt-1.5 text-xs text-subtle">Active folders organizing link inspiration feeds.</p>
                </div>
              </div>

              {/* Contribution Activity Map (OpenAI inspired Grid) */}
              <section className="space-y-3">
                <h3 className="text-xs font-mono tracking-wider text-subtle uppercase">Link addition activity</h3>
                <div className="rounded-xl border border-border bg-surface p-5 hover:border-neutral-800 transition duration-300">
                  {loadingStats ? (
                    <div className="flex h-36 items-center justify-center">
                      <AppLoader compact label="Loading activity..." />
                    </div>
                  ) : (
                    renderContributionGrid()
                  )}
                </div>
              </section>

              {/* Density by groups */}
              <section className="space-y-3">
                <h3 className="text-xs font-mono tracking-wider text-subtle uppercase">Link density by group</h3>
                <div className="rounded-xl border border-border bg-surface p-5 divide-y divide-border/60 hover:border-neutral-800 transition duration-300">
                  {loadingStats ? (
                    <div className="space-y-4 py-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="space-y-2">
                          <div className="h-3 w-28 animate-pulse bg-pill rounded" />
                          <div className="h-2 w-full animate-pulse bg-pill rounded" />
                        </div>
                      ))}
                    </div>
                  ) : linksByGroup.length === 0 ? (
                    <p className="text-xs text-subtle py-4 text-center">No categories created yet.</p>
                  ) : (
                    linksByGroup.map((group) => {
                      const maxVal = Math.max(...linksByGroup.map(g => g.count), 1);
                      const percent = Math.max(2, Math.round((group.count / maxVal) * 100));
                      
                      // Match progress bar colors to active banner style
                      let barColor = "bg-neutral-400";
                      if (bannerStyle === "aurora") barColor = "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.4)]";
                      else if (bannerStyle === "twilight") barColor = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
                      else if (bannerStyle === "ocean") barColor = "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]";
                      else if (bannerStyle === "midnight") barColor = "bg-neutral-100 shadow-[0_0_8px_rgba(255,255,255,0.4)]";

                      return (
                        <div key={group.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">{group.name}</span>
                            <span className="font-mono text-muted tabular-nums">
                              {group.count} link{group.count === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-pill">
                            <div
                              style={{ width: `${percent}%` }}
                              className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

            </div>
          )}

        </div>
      </main>

      {/* Account Deactivation Confirmation Modal Overlay */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-[420px] rounded-xl border border-danger/35 bg-surface p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5 text-danger">
              <AlertTriangle className="size-5" />
              <h3 className="text-sm font-bold uppercase font-mono tracking-wider">Confirm Deactivation</h3>
            </div>
            
            <p className="text-xs text-muted leading-relaxed">
              This action is <strong className="text-foreground">permanent</strong>. Your database links will be wiped and your configuration cleared from this browser session.
            </p>

            {deactivatedSuccess ? (
              <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-xs font-semibold text-center animate-pulse">
                Workspace wiped. Redirecting...
              </div>
            ) : (
              <form onSubmit={handleDeactivate} className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-medium text-subtle font-mono uppercase">
                    Type <code className="text-danger select-none">deactivate</code> to confirm
                  </span>
                  <input
                    type="text"
                    value={deactivateInput}
                    onChange={(e) => setDeactivateInput(e.target.value)}
                    placeholder="deactivate"
                    className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground outline-none font-mono focus:border-danger/50"
                    required
                    disabled={isDeactivating}
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeactivateModal(false);
                      setDeactivateInput("");
                    }}
                    disabled={isDeactivating}
                    className="flex-1 h-8 text-xs font-medium border border-border rounded-lg text-muted hover:bg-pill transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deactivateInput !== "deactivate" || isDeactivating}
                    className="flex-1 h-8 text-xs font-semibold bg-danger text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition flex items-center justify-center cursor-pointer"
                  >
                    {isDeactivating ? <AppLoader compact progressive label="deactivating" /> : "Wipe everything"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Savee & Zeplin Inspired Onboarding / Login Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
          <div className="w-full max-w-[460px] rounded-xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col relative">
            
            {/* Modal Progress Indicator */}
            <div className="h-1 w-full bg-pill flex">
              <div
                style={{ width: `${(authStep / 3) * 100}%` }}
                className="h-full bg-foreground transition-all duration-300"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAuthModal(false);
                setAuthStep(1);
              }}
              className="absolute top-4 right-4 text-subtle hover:text-foreground text-xs font-mono border border-border rounded px-2 py-0.5 bg-neutral-900 hover:bg-pill transition cursor-pointer"
            >
              ESC
            </button>

            <div className="p-8 space-y-6">
              
              {/* Header */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest text-subtle uppercase">
                  Step {authStep} of 3
                </span>
                <h3 className="text-lg font-bold font-mono uppercase text-foreground">
                  {authStep === 1 && "Create Your Account"}
                  {authStep === 2 && "Select Workspace Role"}
                  {authStep === 3 && "Personalize Accent Theme"}
                </h3>
                <p className="text-xs text-subtle">
                  {authStep === 1 && "Start archiving web layouts and screenshots in high-fidelity."}
                  {authStep === 2 && "Help personalize your categories and feed recommendation system."}
                  {authStep === 3 && "Select a brand profile banner to matching your custom dashboard."}
                </p>
              </div>

              {authSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3">
                  <CheckCircle2 className="size-10 text-success animate-bounce" />
                  <p className="text-sm font-semibold font-mono uppercase text-success">Workspace Synced!</p>
                  <p className="text-[11px] text-subtle text-center">Your profile settings have been successfully updated.</p>
                </div>
              ) : (
                <form onSubmit={handleMockOnboardingSubmit} className="space-y-4">
                  
                  {/* Step 1: Login Credentials */}
                  {authStep === 1 && (
                    <div className="space-y-4">
                      <label className="block space-y-1.5">
                        <span className="text-[11px] font-medium text-muted">Work Email Address</span>
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="e.g. designer@agency.com"
                          className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition"
                          required
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-[11px] font-medium text-muted">Password</span>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 pr-10 text-sm text-foreground outline-none focus:border-foreground/30 transition"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-subtle hover:text-foreground cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </label>

                      {/* Mock Social SSO Auth (Savee/Vimeo styled) */}
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-mono"><span className="bg-surface px-2 text-subtle">Or continue with</span></div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthEmail("github@auth.dev");
                            setAuthPassword("githubpass123");
                            setAuthStep(2);
                          }}
                          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-neutral-900/60 text-xs text-muted hover:bg-pill hover:text-foreground transition cursor-pointer"
                        >
                          <GithubIcon className="size-4" />
                          GitHub
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthEmail("google@auth.dev");
                            setAuthPassword("googlepass123");
                            setAuthStep(2);
                          }}
                          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-neutral-900/60 text-xs text-muted hover:bg-pill hover:text-foreground transition cursor-pointer"
                        >
                          <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                          </svg>
                          Google
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Role Selection (Zeplin styled Cards) */}
                  {authStep === 2 && (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "designer", label: "Designer", desc: "Ui/ux layouts references" },
                        { id: "developer", label: "Developer", desc: "Front-end components" },
                        { id: "creator", label: "Creator", desc: "Content & design assets" },
                        { id: "manager", label: "Product Manager", desc: "Competitor benchmarks" }
                      ].map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setAuthRole(role.id)}
                          className={`relative text-left p-3.5 rounded-lg border transition-all duration-300 ${
                            authRole === role.id ? "border-foreground bg-surface-elevated scale-102 shadow-md" : "border-border bg-neutral-900/40 hover:border-neutral-700"
                          } cursor-pointer`}
                        >
                          <p className="text-xs font-semibold text-foreground font-mono uppercase">{role.label}</p>
                          <p className="text-[9px] text-subtle mt-1 leading-normal">{role.desc}</p>
                          {authRole === role.id && (
                            <span className="absolute top-2 right-2 size-2 rounded-full bg-foreground" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Step 3: Accent Theme Selector */}
                  {authStep === 3 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {BANNER_GRADIENTS.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setAuthTheme(b.id)}
                            className={`relative text-left p-2.5 rounded-lg border transition-all duration-300 ${
                              authTheme === b.id ? "border-foreground bg-surface-elevated scale-102" : "border-border bg-neutral-900/40 hover:border-neutral-700"
                            } cursor-pointer`}
                          >
                            <div className={`h-8 w-full rounded-md ${b.class}`} />
                            <span className="text-[10px] font-mono uppercase font-semibold text-muted truncate block mt-2">{b.label}</span>
                            {authTheme === b.id && (
                              <span className="absolute top-2 right-2 size-2 rounded-full bg-foreground" />
                            )}
                          </button>
                        ))}
                      </div>
                      
                      {/* Live accent simulation preview box */}
                      <div className="p-3 border border-border bg-neutral-900/80 rounded-lg flex items-center justify-between text-[11px] font-mono">
                        <span className="text-subtle">Accent Simulation:</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`size-3 rounded-full ${
                            authTheme === "aurora" ? "bg-teal-500" :
                            authTheme === "twilight" ? "bg-rose-500" :
                            authTheme === "ocean" ? "bg-blue-500" : "bg-neutral-100"
                          } animate-pulse`} />
                          <span className="text-foreground uppercase">{authTheme} active</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nav Actions */}
                  <div className="flex gap-2 pt-2">
                    {authStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setAuthStep(authStep - 1)}
                        className="flex-1 h-9 border border-border text-xs font-semibold rounded-lg text-muted hover:bg-pill transition cursor-pointer"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-[2] h-9 bg-pill-active text-pill-active-fg text-xs font-bold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {authStep === 3 ? "Complete Sync" : "Continue"}
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
