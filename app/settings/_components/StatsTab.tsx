import { useEffect, useState } from "react";
import { FolderKanban, TrendingUp } from "lucide-react";
import { AppLoader } from "@/components/AppLoader";

type GroupStat = {
  id: string;
  name: string;
  count: number;
};

type FrequencyStat = {
  date: string;
  count: number;
};

function renderContributionGrid(linkFrequency: FrequencyStat[]) {
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
        className={`size-2.5 rounded-sm cursor-pointer ${colorClass}`}
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
}

type StatsTabProps = {
  bannerStyle: string;
};

export function StatsTab({ bannerStyle }: StatsTabProps) {
  const [totalLinks, setTotalLinks] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [linksByGroup, setLinksByGroup] = useState<GroupStat[]>([]);
  const [linkFrequency, setLinkFrequency] = useState<FrequencyStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

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
            renderContributionGrid(linkFrequency)
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
