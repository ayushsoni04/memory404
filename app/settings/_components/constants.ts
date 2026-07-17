export const BANNER_GRADIENTS = [
  { id: "midnight", label: "Midnight Onyx", class: "bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-border" },
  { id: "aurora", label: "Aurora Teal", class: "bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-b border-emerald-900/30" },
  { id: "twilight", label: "Twilight Violet", class: "bg-gradient-to-r from-indigo-950 via-rose-950 to-indigo-950 border-b border-rose-950/30" },
  { id: "ocean", label: "Deep Ocean", class: "bg-gradient-to-r from-sky-950 via-blue-900 to-sky-950 border-b border-blue-900/30" },
];

export const PRICING = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 15, yearly: 12 },
  team: { monthly: 29, yearly: 24 },
};

export type Tab = "profile" | "membership" | "statistics";
export type Plan = "free" | "pro" | "team";
export type BillingCycle = "monthly" | "yearly";
