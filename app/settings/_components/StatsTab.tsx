import { useCallback, useEffect, useState } from "react";
import { FolderKanban, TrendingUp } from "lucide-react";
import { AppLoader } from "@/components/AppLoader";
import { buildActivityCells } from "@/lib/activity-grid";
import { ActivityGrid } from "./ActivityGrid";

type GroupStat = {
  id: string;
  name: string;
  count: number;
};

type FrequencyStat = {
  date: string;
  count: number;
};

type StatsTabProps = {
  bannerStyle: string;
};

export function StatsTab({ bannerStyle }: StatsTabProps) {
  const [totalLinks, setTotalLinks] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [linksByGroup, setLinksByGroup] = useState<GroupStat[]>([]);
  const [linkFrequency, setLinkFrequency] = useState<FrequencyStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const res = await fetch("/api/stats");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const message =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "Could not load statistics";
        throw new Error(message);
      }
      setTotalLinks(typeof data.totalLinks === "number" ? data.totalLinks : 0);
      setTotalGroups(typeof data.totalGroups === "number" ? data.totalGroups : 0);
      setLinksByGroup(Array.isArray(data.linksByGroup) ? data.linksByGroup : []);
      setLinkFrequency(Array.isArray(data.linkFrequency) ? data.linkFrequency : []);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "Could not load statistics");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (!loadingStats && statsError) {
    return (
      <div
        className="flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-surface-elevated p-6"
        role="alert"
      >
        <p className="text-sm text-danger">{statsError}</p>
        <p className="text-[13px] text-subtle">
          Your saved links are still in the library.
        </p>
        <button
          type="button"
          onClick={() => void loadStats()}
          className="inline-flex h-8 items-center justify-center rounded-full bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg transition-[transform,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
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
            <ActivityGrid cells={buildActivityCells(linkFrequency)} />
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
              const maxVal = Math.max(...linksByGroup.map((g) => g.count), 1);
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
                      style={{ transform: `scaleX(${percent / 100})` }}
                      className={`h-full w-full origin-left rounded-full transition-transform duration-[250ms] ease-[var(--ease-out)] ${barColor}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

    </div>
  );
}
