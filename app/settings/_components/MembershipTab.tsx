import { Check, Download, Info, Users } from "lucide-react";
import { PRICING, type BillingCycle, type Plan } from "./constants";

type MembershipTabProps = {
  billingCycle: BillingCycle;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  currentPlan: Plan;
  onPlanChange: (plan: Plan) => void;
  teamSeats: number;
  onSeatsChange: (seats: number) => void;
};

export function MembershipTab({
  billingCycle,
  onBillingCycleChange,
  currentPlan,
  onPlanChange,
  teamSeats,
  onSeatsChange,
}: MembershipTabProps) {
  return (
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
            onClick={() => onBillingCycleChange("monthly")}
            className={`h-7 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors duration-150 uppercase font-mono ${
              billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => onBillingCycleChange("yearly")}
            className={`h-7 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors duration-150 uppercase font-mono relative ${
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
          onClick={() => onPlanChange("free")}
          className={`relative cursor-pointer rounded-xl border p-5 transition-[transform,background-color,border-color] duration-[160ms] ease-[var(--ease-out)] flex flex-col justify-between ${
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
              <span className="text-3xl font-bold tracking-tight text-foreground">${PRICING.free[billingCycle]}</span>
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
          onClick={() => onPlanChange("pro")}
          className={`relative cursor-pointer rounded-xl border p-5 transition-[transform,background-color,border-color] duration-[160ms] ease-[var(--ease-out)] flex flex-col justify-between ${
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
              <span className="text-3xl font-bold tracking-tight text-foreground">${PRICING.pro[billingCycle]}</span>
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
          onClick={() => onPlanChange("team")}
          className={`relative cursor-pointer rounded-xl border p-5 transition-[transform,background-color,border-color] duration-[160ms] ease-[var(--ease-out)] flex flex-col justify-between ${
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
                ${PRICING.team[billingCycle] * teamSeats}
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
              onChange={(e) => onSeatsChange(Number(e.target.value))}
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
              ${billingCycle === "yearly" ? PRICING.team.yearly * teamSeats * 12 : PRICING.team.monthly * teamSeats * 1}.00
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
                  { date: "Jul 1, 2026", id: "INV-004", amount: currentPlan === "team" ? `$${PRICING.team[billingCycle] * teamSeats}.00` : currentPlan === "pro" ? `$${PRICING.pro[billingCycle]}.00` : "$0.00", status: "Paid" },
                  { date: "Jun 1, 2026", id: "INV-003", amount: currentPlan === "team" ? `$${PRICING.team[billingCycle] * teamSeats}.00` : currentPlan === "pro" ? `$${PRICING.pro[billingCycle]}.00` : "$0.00", status: "Paid" },
                  { date: "May 1, 2026", id: "INV-002", amount: currentPlan === "team" ? `$${PRICING.team[billingCycle] * teamSeats}.00` : currentPlan === "pro" ? `$${PRICING.pro[billingCycle]}.00` : "$0.00", status: "Paid" },
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
  );
}
