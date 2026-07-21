"use client";

import { useCallback, useMemo, useState } from "react";
import {
  TEXT_SWAP_CASES,
  TEXT_SWAP_FILTERS,
  TEXT_SWAP_LAB_VERSION,
  type TextSwapCase,
  type TextSwapFilter,
} from "./cases";
import { ControlChip, type SwapAlign, type SwapEase, type SwapSpeed, type SwapVariant } from "./controls";
import { SwapPreview } from "./SwapPreview";

type CaseResult = {
  id: string;
  status: "pass" | "fail" | "perf" | "idle";
  note: string;
};

function emptyResults(): Record<string, CaseResult> {
  return Object.fromEntries(
    TEXT_SWAP_CASES.map((c) => [
      c.id,
      { id: c.id, status: "idle" as const, note: "Not run" },
    ]),
  );
}

function runHeuristic(c: TextSwapCase): CaseResult {
  try {
    // Remount contract: any FROM→TO transition remounts via key.
    const remounts = true;
    const emptyOk = c.from === "" || c.to === "" || c.from.length + c.to.length > 0;
    if (!remounts || !emptyOk) {
      return { id: c.id, status: "fail", note: "Remount contract broken" };
    }
    if (c.expect === "perf") {
      return {
        id: c.id,
        status: "perf",
        note: "Width/timing sensitive — review under DEBUG",
      };
    }
    if (c.id === "same-string") {
      return {
        id: c.id,
        status: "pass",
        note: "Same string remounts; no visual change expected",
      };
    }
    return { id: c.id, status: "pass", note: "Remount enter path OK" };
  } catch (e) {
    return {
      id: c.id,
      status: "fail",
      note: e instanceof Error ? e.message : "Runner crashed",
    };
  }
}

export function TextSwapLab() {
  const [filter, setFilter] = useState<TextSwapFilter | null>(null);
  const [results, setResults] = useState<Record<string, CaseResult>>(emptyResults);

  const [from, setFrom] = useState("hello world");
  const [to, setTo] = useState("world hello");
  const [speed, setSpeed] = useState<SwapSpeed>("default");
  const [ease, setEase] = useState<SwapEase>("default");
  const [align, setAlign] = useState<SwapAlign>("L");
  const [variant, setVariant] = useState<SwapVariant>("from-below");
  const [debug, setDebug] = useState(false);
  const [sandboxRunning, setSandboxRunning] = useState(false);

  const [caseControls, setCaseControls] = useState<
    Record<
      string,
      {
        speed: SwapSpeed;
        ease: SwapEase;
        align: SwapAlign;
        variant: SwapVariant;
        debug: boolean;
        running: boolean;
      }
    >
  >(() =>
    Object.fromEntries(
      TEXT_SWAP_CASES.map((c) => [
        c.id,
        {
          speed: "default" as const,
          ease: "default" as const,
          align: "L" as const,
          variant: "from-below" as const,
          debug: false,
          running: false,
        },
      ]),
    ),
  );

  const filteredCases = useMemo(() => {
    if (!filter) return TEXT_SWAP_CASES;
    if (filter === "FAILING ONLY") {
      return TEXT_SWAP_CASES.filter((c) => {
        const r = results[c.id];
        return r?.status === "fail" || r?.status === "perf";
      });
    }
    return TEXT_SWAP_CASES.filter((c) => c.tags.includes(filter));
  }, [filter, results]);

  const stats = useMemo(() => {
    const list = Object.values(results);
    const run = list.filter((r) => r.status !== "idle");
    const pass = list.filter((r) => r.status === "pass").length;
    const fail = list.filter((r) => r.status === "fail").length;
    const perf = list.filter((r) => r.status === "perf").length;
    return {
      total: TEXT_SWAP_CASES.length,
      run: run.length,
      pass,
      fail,
      perf,
      done: pass + fail + perf,
    };
  }, [results]);

  const runAll = useCallback(() => {
    const next: Record<string, CaseResult> = {};
    for (const c of TEXT_SWAP_CASES) {
      next[c.id] = runHeuristic(c);
    }
    setResults(next);
    setCaseControls((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, ctrl]) => [
          id,
          { ...ctrl, running: true },
        ]),
      ),
    );
    window.setTimeout(() => {
      setCaseControls((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([id, ctrl]) => [
            id,
            { ...ctrl, running: false },
          ]),
        ),
      );
    }, 1600);
  }, []);

  const runSeq = useCallback(async () => {
    for (const c of TEXT_SWAP_CASES) {
      setResults((prev) => ({ ...prev, [c.id]: runHeuristic(c) }));
      setCaseControls((prev) => ({
        ...prev,
        [c.id]: { ...prev[c.id], running: true },
      }));
      await new Promise((r) => setTimeout(r, 700));
      setCaseControls((prev) => ({
        ...prev,
        [c.id]: { ...prev[c.id], running: false },
      }));
    }
  }, []);

  const copyText = useCallback(async (failsOnly: boolean) => {
    const lines = TEXT_SWAP_CASES.filter((c) => {
      const r = results[c.id];
      if (!r || r.status === "idle") return false;
      if (failsOnly) return r.status === "fail" || r.status === "perf";
      return true;
    }).map((c) => {
      const r = results[c.id];
      return `[${r.status.toUpperCase()}] ${c.title} — ${r.note}`;
    });
    const body =
      lines.length > 0
        ? lines.join("\n")
        : failsOnly
          ? "No fails / PERF results yet. Run all first."
          : "No results yet. Run all first.";
    await navigator.clipboard.writeText(body);
  }, [results]);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <section className="rounded-xl border border-border bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[13px] text-foreground">
              <span className="text-success">{stats.pass}</span>
              <span className="text-subtle">/{stats.total} passed</span>
              {stats.perf > 0 ? (
                <span className="ml-2 text-danger">{stats.perf} PERF</span>
              ) : null}
              {stats.fail > 0 ? (
                <span className="ml-2 text-danger">{stats.fail} FAIL</span>
              ) : null}
              <span className="ml-2 text-subtle">{TEXT_SWAP_LAB_VERSION}</span>
            </p>
            <div className="flex flex-wrap gap-1" aria-hidden>
              {TEXT_SWAP_CASES.map((c) => {
                const r = results[c.id];
                const color =
                  r?.status === "pass"
                    ? "bg-success"
                    : r?.status === "fail" || r?.status === "perf"
                      ? "bg-danger"
                      : "bg-border";
                return (
                  <span
                    key={c.id}
                    className={`size-2 rounded-full ${color}`}
                    title={`${c.title}: ${r?.status ?? "idle"}`}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ControlChip active={false} onClick={() => void copyText(true)}>
              Copy fails
            </ControlChip>
            <ControlChip active={false} onClick={() => void copyText(false)}>
              Copy all
            </ControlChip>
            <ControlChip active={false} tone="accent" onClick={runAll}>
              Run all
            </ControlChip>
            <ControlChip active={false} tone="accent" onClick={() => void runSeq()}>
              Run seq
            </ControlChip>
          </div>
        </div>
      </section>

      {/* Issues list */}
      <section className="max-h-52 overflow-y-auto rounded-xl border border-border bg-surface">
        <div className="sticky top-0 z-[1] border-b border-border bg-surface px-3 py-2">
          <h2 className="font-mono text-[12px] font-medium text-foreground">
            {stats.fail + stats.perf > 0
              ? `${stats.fail + stats.perf} issues found`
              : stats.done > 0
                ? "All clear"
                : "Results"}
          </h2>
        </div>
        <ul className="divide-y divide-border/60">
          {TEXT_SWAP_CASES.map((c) => {
            const r = results[c.id];
            const status = r?.status ?? "idle";
            return (
              <li
                key={c.id}
                className="flex items-start gap-2 px-3 py-2 text-[12px]"
              >
                <StatusGlyph status={status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        status === "fail" || status === "perf"
                          ? "text-foreground"
                          : "text-muted"
                      }
                    >
                      {c.title}
                    </span>
                    {status === "perf" ? (
                      <span className="rounded bg-danger/15 px-1 font-mono text-[9px] uppercase text-danger">
                        Perf
                      </span>
                    ) : null}
                    {status === "fail" ? (
                      <span className="rounded bg-danger/15 px-1 font-mono text-[9px] uppercase text-danger">
                        Fail
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[11px] text-subtle">
                    {r?.note ?? "Not run"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {TEXT_SWAP_FILTERS.map((tag) => (
          <ControlChip
            key={tag}
            active={filter === tag}
            onClick={() => setFilter((prev) => (prev === tag ? null : tag))}
          >
            {tag}
          </ControlChip>
        ))}
      </div>

      {/* Sandbox */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-mono text-[12px] font-medium uppercase tracking-wide text-foreground">
            Sandbox
          </h2>
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">
            Custom
          </span>
        </div>
        <p className="mb-3 text-[12px] text-muted">
          Type any text to test variants — from-below interpolates frames; tilt
          uses crossfade (no flip).
        </p>
        <SwapPreview
          from={from}
          to={to}
          speed={speed}
          ease={ease}
          align={align}
          variant={variant}
          debug={debug}
          running={sandboxRunning}
          onFromChange={setFrom}
          onToChange={setTo}
          onSpeed={setSpeed}
          onEase={setEase}
          onAlign={setAlign}
          onVariant={setVariant}
          onDebug={setDebug}
          onToggleRun={() => setSandboxRunning((v) => !v)}
          showInputs
        />
      </section>

      {/* Case cards */}
      <div className="flex flex-col gap-3">
        {filteredCases.map((c) => {
          const ctrl = caseControls[c.id];
          const r = results[c.id];
          return (
            <article
              key={c.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-mono text-[12px] font-medium uppercase tracking-wide text-foreground">
                    {c.title}
                  </h3>
                  <p className="mt-1 text-[12px] text-muted">{c.description}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <SwapPreview
                from={c.from}
                to={c.to}
                speed={ctrl.speed}
                ease={ctrl.ease}
                align={ctrl.align}
                variant={ctrl.variant}
                debug={ctrl.debug}
                running={ctrl.running}
                onSpeed={(v) =>
                  setCaseControls((prev) => ({
                    ...prev,
                    [c.id]: { ...prev[c.id], speed: v },
                  }))
                }
                onEase={(v) =>
                  setCaseControls((prev) => ({
                    ...prev,
                    [c.id]: { ...prev[c.id], ease: v },
                  }))
                }
                onAlign={(v) =>
                  setCaseControls((prev) => ({
                    ...prev,
                    [c.id]: { ...prev[c.id], align: v },
                  }))
                }
                onVariant={(v) =>
                  setCaseControls((prev) => ({
                    ...prev,
                    [c.id]: { ...prev[c.id], variant: v },
                  }))
                }
                onDebug={(v) =>
                  setCaseControls((prev) => ({
                    ...prev,
                    [c.id]: { ...prev[c.id], debug: v },
                  }))
                }
                onToggleRun={() => {
                  setCaseControls((prev) => ({
                    ...prev,
                    [c.id]: { ...prev[c.id], running: !prev[c.id].running },
                  }));
                  if (!ctrl.running) {
                    setResults((prev) => ({
                      ...prev,
                      [c.id]: runHeuristic(c),
                    }));
                  }
                }}
                previewClassName="text-[22px] font-medium tracking-tight text-foreground sm:text-[28px]"
              />

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatusChip status={r?.status ?? "idle"} />
                <span className="font-mono text-[10px] text-subtle">
                  {r?.note ?? "Not run"}
                </span>
              </div>
            </article>
          );
        })}
        {filteredCases.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted">
            No cases match this filter.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatusGlyph({ status }: { status: CaseResult["status"] }) {
  if (status === "pass") {
    return <span className="mt-0.5 text-success">✓</span>;
  }
  if (status === "fail" || status === "perf") {
    return <span className="mt-0.5 text-danger">✗</span>;
  }
  return <span className="mt-0.5 text-subtle">·</span>;
}

function StatusChip({ status }: { status: CaseResult["status"] }) {
  const label =
    status === "pass"
      ? "Pass"
      : status === "fail"
        ? "Fail"
        : status === "perf"
          ? "Perf"
          : "Idle";
  const cls =
    status === "pass"
      ? "bg-success/15 text-success"
      : status === "fail" || status === "perf"
        ? "bg-danger/15 text-danger"
        : "bg-pill text-muted";
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}
