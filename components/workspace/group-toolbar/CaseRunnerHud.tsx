"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import {
  TOOLBAR_CASES,
  TOOLBAR_CASE_FILTERS,
  type ToolbarCase,
  type ToolbarCaseFilter,
} from "./cases";
import {
  DEFAULT_TOOLBAR_CONFIG,
  GROUP_TOOLBAR_LAB_VERSION,
  type ToolbarLabConfig,
} from "./defaults";
import type { CaseResult, CaseStatus } from "./runner";

type Props = {
  config: ToolbarLabConfig;
  results: Record<string, CaseResult>;
  filter: ToolbarCaseFilter | null;
  onFilter: (next: ToolbarCaseFilter | null) => void;
  running: boolean;
  runProgress: number;
  issuesOpen: boolean;
  onIssuesOpen: (open: boolean) => void;
  onRunAll: () => void;
  onRunSeq: () => void;
  onCopyFails: () => void;
  onCopyAll: () => void;
};

function metricDelta(
  label: string,
  current: number,
  base: number,
  unit = "",
): { label: string; value: string; delta: string; worse: boolean } {
  const d = current - base;
  const worse = d !== 0;
  const sign = d > 0 ? "+" : "";
  return {
    label,
    value: `${current}${unit}`,
    delta: worse ? `${sign}${Number.isInteger(d) ? d : d.toFixed(2)}${unit}` : "",
    worse,
  };
}

function ResultIcon({ status }: { status: CaseStatus }) {
  if (status === "pass") {
    return (
      <span className="inline-flex size-4 shrink-0 items-center justify-center border border-foreground/35 text-foreground">
        <Check className="size-2.5" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (status === "fail" || status === "perf") {
    return (
      <span className="inline-flex size-4 shrink-0 items-center justify-center border border-foreground/35 text-foreground">
        <X className="size-2.5" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span className="inline-flex size-4 shrink-0 border border-border/60" />
  );
}

function categoryStats(results: Record<string, CaseResult>) {
  const cats = ["performance", "visual", "functional", "accessibility"] as const;
  return cats.map((cat) => {
    const cases = TOOLBAR_CASES.filter((c) => c.category === cat);
    const pass = cases.filter((c) => results[c.id]?.status === "pass").length;
    const bad = cases.filter(
      (c) =>
        results[c.id]?.status === "fail" || results[c.id]?.status === "perf",
    ).length;
    return { cat, total: cases.length, pass, bad };
  });
}

export function CaseRunnerHud({
  config,
  results,
  filter,
  onFilter,
  running,
  runProgress,
  issuesOpen,
  onIssuesOpen,
  onRunAll,
  onRunSeq,
  onCopyFails,
  onCopyAll,
}: Props) {
  const done = Object.values(results).filter((r) => r.status !== "idle").length;
  const pass = Object.values(results).filter((r) => r.status === "pass").length;
  const issues = Object.values(results).filter(
    (r) => r.status === "fail" || r.status === "perf",
  ).length;

  const statusLabel = running
    ? `Running… ${runProgress}/${TOOLBAR_CASES.length}`
    : done === 0
      ? "Idle"
      : issues > 0
        ? `${issues} issue${issues === 1 ? "" : "s"}`
        : `Done ${pass}/${TOOLBAR_CASES.length}`;

  const progressPct = running
    ? Math.round((runProgress / TOOLBAR_CASES.length) * 100)
    : done === 0
      ? 0
      : Math.round((done / TOOLBAR_CASES.length) * 100);

  const metrics = useMemo(
    () => [
      metricDelta("pillGap", config.pillGap, DEFAULT_TOOLBAR_CONFIG.pillGap, "px"),
      metricDelta("rowGap", config.rowGap, DEFAULT_TOOLBAR_CONFIG.rowGap, "px"),
      metricDelta(
        "drag",
        config.dragScale,
        DEFAULT_TOOLBAR_CONFIG.dragScale,
      ),
      ...categoryStats(results).map((c) => ({
        label: c.cat.slice(0, 4),
        value: `${c.pass}/${c.total}`,
        delta: c.bad > 0 ? `${c.bad}⚠` : "",
        worse: c.bad > 0,
      })),
    ],
    [config, results],
  );

  const listCases: ToolbarCase[] = useMemo(() => {
    if (!filter) return TOOLBAR_CASES;
    if (filter === "FAILING ONLY") {
      return TOOLBAR_CASES.filter((c) => {
        const r = results[c.id];
        return r?.status === "fail" || r?.status === "perf";
      });
    }
    return TOOLBAR_CASES.filter((c) => c.tags.includes(filter));
  }, [filter, results]);

  return (
    <div className="flex flex-col gap-3">
      {/* Status HUD — inspired by compact runner overlays */}
      <section className="rounded-lg border border-border/80 bg-[#141414]/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-departure text-[13px] tracking-wide text-foreground">
              {statusLabel}{" "}
              <span className="text-subtle">{GROUP_TOOLBAR_LAB_VERSION}</span>
            </p>
          </div>
          <div
            className="grid max-w-[200px] grid-cols-10 gap-1"
            aria-hidden
            title="Case status grid"
          >
            {TOOLBAR_CASES.map((c) => {
              const r = results[c.id];
              const color =
                r?.status === "pass"
                  ? "bg-[#3ddc84]"
                  : r?.status === "fail"
                    ? "bg-[#ff5c5c]"
                    : r?.status === "perf"
                      ? "bg-[#ff8a4c]"
                      : running &&
                          TOOLBAR_CASES.indexOf(c) < runProgress
                        ? "bg-[#3ddc84]/50"
                        : "bg-neutral-700";
              return (
                <span
                  key={c.id}
                  className={`size-1.5 rounded-full ${color}`}
                  title={`${c.title}: ${r?.status ?? "idle"}`}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-2.5 h-px w-full overflow-hidden bg-neutral-800">
          <div
            className="h-full bg-[#f5d547] transition-[width] duration-150 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 font-departure text-[11px] tracking-wide text-muted">
            {metrics.slice(0, 6).map((m) => (
              <span key={m.label} className="whitespace-nowrap">
                <span className="text-subtle">{m.label}</span>{" "}
                <span className="text-foreground/80">{m.value}</span>
                {m.delta ? (
                  <span
                    className={
                      m.worse ? "ml-1 text-[#ff6b8a]" : "ml-1 text-success"
                    }
                  >
                    {m.delta}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onCopyFails}
              className="rounded border border-neutral-600 px-2 py-1 font-departure text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-neutral-400 hover:text-foreground"
            >
              Copy fails
            </button>
            <button
              type="button"
              onClick={onCopyAll}
              className="rounded border border-neutral-600 px-2 py-1 font-departure text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-neutral-400 hover:text-foreground"
            >
              Copy all
            </button>
            <button
              type="button"
              onClick={onRunAll}
              disabled={running}
              className="rounded border border-neutral-500 bg-neutral-800 px-2 py-1 font-departure text-[10px] uppercase tracking-wider text-foreground transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              Run all
            </button>
            <button
              type="button"
              onClick={onRunSeq}
              disabled={running}
              className="rounded border border-[#f5d547]/50 px-2 py-1 font-departure text-[10px] uppercase tracking-wider text-[#f5d547] transition-colors hover:bg-[#f5d547]/10 disabled:opacity-50"
            >
              Run seq
            </button>
          </div>
        </div>
      </section>

      {/* Issues panel */}
      {issuesOpen ? (
        <section className="overflow-hidden rounded-lg border border-border/80 bg-[#121212] shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
            <h2 className="font-departure text-[13px] tracking-wide text-foreground">
              {done === 0
                ? "Results"
                : issues > 0
                  ? `${issues} issue${issues === 1 ? "" : "s"} found`
                  : "All clear"}
            </h2>
            <button
              type="button"
              onClick={() => onIssuesOpen(false)}
              className="inline-flex size-6 items-center justify-center text-muted transition-colors hover:text-foreground"
              aria-label="Close results"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {listCases.map((c) => {
              const r = results[c.id];
              const status = r?.status ?? "idle";
              const isIssue = status === "fail" || status === "perf";
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.03]"
                >
                  <ResultIcon status={status} />
                  <span
                    className={`min-w-0 flex-1 truncate font-departure text-[12px] tracking-wide ${
                      isIssue ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {c.title}
                  </span>
                  {status === "perf" ? (
                    <span className="shrink-0 rounded-[2px] bg-[#5c1f1f] px-1.5 py-0.5 font-departure text-[9px] uppercase tracking-wider text-[#ffb4b4]">
                      Perf
                    </span>
                  ) : null}
                  {status === "fail" ? (
                    <span className="shrink-0 rounded-[2px] bg-[#5c1f1f] px-1.5 py-0.5 font-departure text-[9px] uppercase tracking-wider text-[#ffb4b4]">
                      Fail
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => onIssuesOpen(true)}
          className="self-start font-departure text-[11px] tracking-wide text-subtle underline-offset-2 hover:text-foreground hover:underline"
        >
          Show results panel
        </button>
      )}

      {/* Filter strip */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {TOOLBAR_CASE_FILTERS.map((tag) => {
          const active = filter === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onFilter(active ? null : tag)}
              className={`font-departure text-[10px] uppercase tracking-[0.08em] transition-colors ${
                active
                  ? "text-foreground"
                  : "text-subtle hover:text-muted"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
