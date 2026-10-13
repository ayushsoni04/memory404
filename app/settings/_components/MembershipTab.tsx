import { Check, Info } from "lucide-react";
import { PRICING, type Plan } from "./constants";

type MembershipTabProps = {
  currentPlan: Plan;
};

export function MembershipTab({ currentPlan }: MembershipTabProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3">
        <Info className="size-4 text-muted shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Billing coming soon</h3>
          <p className="text-xs text-subtle mt-0.5">
            You&apos;re on the free plan. Paid upgrades (Pro / Team) will unlock here later —
            plan changes are not available yet.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(
          [
            {
              id: "free" as const,
              label: "Free",
              price: PRICING.free.monthly,
              features: ["Personal vault", "Link + group capture", "Metadata enrich"],
            },
            {
              id: "pro" as const,
              label: "Pro",
              price: PRICING.pro.monthly,
              features: [
                "Unlimited links",
                "Premium screenshots",
                "Custom workspace grids",
              ],
            },
            {
              id: "team" as const,
              label: "Team",
              price: PRICING.team.monthly,
              features: [
                "Shared workspaces",
                "Seat management",
                "Priority enrich queue",
              ],
            },
          ] as const
        ).map((plan) => {
          const active = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-5 flex flex-col justify-between ${
                active
                  ? "border-foreground bg-surface-elevated shadow-xl"
                  : "border-border bg-surface opacity-80"
              }`}
            >
              <div>
                {active && (
                  <span className="absolute top-3 right-3 rounded-full bg-foreground p-0.5 text-background">
                    <Check className="size-3" />
                  </span>
                )}
                <h4 className="text-xs font-semibold tracking-wider text-muted font-mono uppercase">
                  {plan.label}
                </h4>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    ${plan.price}
                  </span>
                  <span className="text-xs text-subtle font-mono">/mo</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-[11px] text-muted">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="size-3.5 text-success shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-5 text-[10px] font-mono uppercase tracking-wide text-subtle">
                {active ? "Current plan" : "Coming soon"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
