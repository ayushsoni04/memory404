"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { ControlChip } from "../text-swap/controls";
import { CaseRunnerHud } from "./CaseRunnerHud";
import {
  TOOLBAR_CASES,
  type ToolbarCaseFilter,
} from "./cases";
import {
  DEFAULT_TOOLBAR_CONFIG,
  VIEWPORTS,
  type ToolbarLabConfig,
  type ViewportId,
} from "./defaults";
import { buildDevPrompt, diffToolbarConfig } from "./prompt";
import { runToolbarCase, type CaseResult } from "./runner";
import { ToolbarSandbox } from "./ToolbarSandbox";

function emptyResults(): Record<string, CaseResult> {
  return Object.fromEntries(
    TOOLBAR_CASES.map((c) => [
      c.id,
      { id: c.id, status: "idle" as const, note: "Not run" },
    ]),
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1 accent-foreground"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-14 rounded-[4px] border border-border bg-surface px-1.5 py-1 font-mono text-[11px] text-foreground outline-none focus:border-border-strong"
        />
      </div>
    </label>
  );
}

export function GroupToolbarLab() {
  const [config, setConfig] = useState<ToolbarLabConfig>(DEFAULT_TOOLBAR_CONFIG);
  const [viewport, setViewport] = useState<ViewportId>("fluid");
  const [showAllScreens, setShowAllScreens] = useState(true);
  const [copied, setCopied] = useState(false);
  const [groupsDraft, setGroupsDraft] = useState(
    DEFAULT_TOOLBAR_CONFIG.groups.join(", "),
  );
  const [filter, setFilter] = useState<ToolbarCaseFilter | null>(null);
  const [results, setResults] = useState<Record<string, CaseResult>>(emptyResults);
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [issuesOpen, setIssuesOpen] = useState(true);
  const runToken = useRef(0);

  const patch = useCallback((next: Partial<ToolbarLabConfig>) => {
    setConfig((prev) => ({ ...prev, ...next }));
  }, []);

  const diffs = useMemo(() => diffToolbarConfig(config), [config]);
  const prompt = useMemo(() => buildDevPrompt(config), [config]);
  const activeViewport = VIEWPORTS.find((v) => v.id === viewport)!;

  const runAll = useCallback(() => {
    runToken.current += 1;
    setRunning(true);
    setRunProgress(0);
    setIssuesOpen(true);
    const next: Record<string, CaseResult> = {};
    for (let i = 0; i < TOOLBAR_CASES.length; i++) {
      const c = TOOLBAR_CASES[i]!;
      next[c.id] = runToolbarCase(c, config);
      setRunProgress(i + 1);
    }
    setResults(next);
    setRunning(false);
  }, [config]);

  const runSeq = useCallback(async () => {
    const token = ++runToken.current;
    setRunning(true);
    setRunProgress(0);
    setIssuesOpen(true);
    setResults(emptyResults());
    for (let i = 0; i < TOOLBAR_CASES.length; i++) {
      if (token !== runToken.current) return;
      const c = TOOLBAR_CASES[i]!;
      setResults((prev) => ({
        ...prev,
        [c.id]: runToolbarCase(c, config),
      }));
      setRunProgress(i + 1);
      await new Promise((r) => setTimeout(r, 90));
    }
    if (token === runToken.current) setRunning(false);
  }, [config]);

  const copyResults = useCallback(
    async (failsOnly: boolean) => {
      const lines = TOOLBAR_CASES.filter((c) => {
        const r = results[c.id];
        if (!r || r.status === "idle") return false;
        if (failsOnly) return r.status === "fail" || r.status === "perf";
        return true;
      }).map((c) => {
        const r = results[c.id]!;
        return `[${r.status.toUpperCase()}] ${c.title} — ${r.note}`;
      });
      const body =
        lines.length > 0
          ? lines.join("\n")
          : failsOnly
            ? "No fails / PERF results yet. Run all first."
            : "No results yet. Run all first.";
      await navigator.clipboard.writeText(body);
    },
    [results],
  );

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const reset = () => {
    runToken.current += 1;
    setRunning(false);
    setRunProgress(0);
    setConfig(DEFAULT_TOOLBAR_CONFIG);
    setGroupsDraft(DEFAULT_TOOLBAR_CONFIG.groups.join(", "));
    setCopied(false);
    setResults(emptyResults());
  };

  const applyGroupsDraft = () => {
    const names = groupsDraft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    patch({
      groups: names,
      active: names.includes(config.active) ? config.active : "all",
    });
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <CaseRunnerHud
          config={config}
          results={results}
          filter={filter}
          onFilter={setFilter}
          running={running}
          runProgress={runProgress}
          issuesOpen={issuesOpen}
          onIssuesOpen={setIssuesOpen}
          onRunAll={runAll}
          onRunSeq={() => void runSeq()}
          onCopyFails={() => void copyResults(true)}
          onCopyAll={() => void copyResults(false)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <ControlChip
            active={showAllScreens}
            onClick={() => setShowAllScreens(true)}
          >
            All screens
          </ControlChip>
          <ControlChip
            active={!showAllScreens}
            onClick={() => setShowAllScreens(false)}
          >
            Single
          </ControlChip>
          {!showAllScreens
            ? VIEWPORTS.map((v) => (
                <ControlChip
                  key={v.id}
                  active={viewport === v.id}
                  onClick={() => setViewport(v.id)}
                >
                  {v.label}
                </ControlChip>
              ))
            : null}
        </div>

        <div className="flex flex-col gap-6 overflow-x-auto rounded-[4px] border border-border bg-surface/40 p-4">
          {showAllScreens ? (
            VIEWPORTS.filter((v) => v.id !== "fluid").map((v) => (
              <ToolbarSandbox
                key={v.id}
                config={config}
                onChange={patch}
                width={v.width}
                label={v.label}
              />
            ))
          ) : (
            <ToolbarSandbox
              config={config}
              onChange={patch}
              width={activeViewport.width}
              label={activeViewport.label}
            />
          )}
        </div>

        <p className="text-[12px] leading-relaxed text-subtle">
          HUD tracks spacing/motion deltas vs production defaults. Run cases
          after tweaks, then copy the prompt for{" "}
          <code className="font-mono text-[11px] text-muted">
            VaultGroupToolbar
          </code>
          .
        </p>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:w-[320px] lg:overflow-y-auto lg:overscroll-contain [scrollbar-width:thin]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-mono text-[12px] font-medium uppercase tracking-wide text-foreground">
            Controls
          </h2>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-[4px] border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-muted transition-colors hover:border-foreground/35 hover:text-foreground"
          >
            <RotateCcw className="size-3" strokeWidth={2} aria-hidden />
            Reset
          </button>
        </div>

        <section className="flex flex-col gap-3 rounded-[4px] border border-border bg-surface p-3">
          <h3 className="font-mono text-[10px] uppercase tracking-wide text-subtle">
            Layout / spacing
          </h3>
          <NumberField
            label="Pad top"
            value={config.padTop}
            min={0}
            max={48}
            onChange={(n) => patch({ padTop: n })}
          />
          <NumberField
            label="Pad bottom"
            value={config.padBottom}
            min={0}
            max={48}
            onChange={(n) => patch({ padBottom: n })}
          />
          <NumberField
            label="Row gap"
            value={config.rowGap}
            min={0}
            max={40}
            onChange={(n) => patch({ rowGap: n })}
          />
          <NumberField
            label="Pill gap"
            value={config.pillGap}
            min={0}
            max={24}
            onChange={(n) => patch({ pillGap: n })}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-[4px] border border-border bg-surface p-3">
          <h3 className="font-mono text-[10px] uppercase tracking-wide text-subtle">
            Pills
          </h3>
          <NumberField
            label="Height"
            value={config.pillHeight}
            min={20}
            max={44}
            onChange={(n) => patch({ pillHeight: n })}
          />
          <NumberField
            label="Pad X"
            value={config.pillPadX}
            min={4}
            max={28}
            onChange={(n) => patch({ pillPadX: n })}
          />
          <NumberField
            label="Radius"
            value={config.pillRadius}
            min={0}
            max={999}
            onChange={(n) => patch({ pillRadius: n })}
          />
          <NumberField
            label="Font size"
            value={config.pillFontSize}
            min={10}
            max={18}
            onChange={(n) => patch({ pillFontSize: n })}
          />
          <div className="flex flex-wrap gap-1.5">
            <ControlChip
              active={config.pillRadius === 999}
              onClick={() => patch({ pillRadius: 999 })}
            >
              Full
            </ControlChip>
            <ControlChip
              active={config.pillRadius === 4}
              onClick={() => patch({ pillRadius: 4 })}
            >
              4px
            </ControlChip>
            <ControlChip
              active={config.pillRadius === 8}
              onClick={() => patch({ pillRadius: 8 })}
            >
              8px
            </ControlChip>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-[4px] border border-border bg-surface p-3">
          <h3 className="font-mono text-[10px] uppercase tracking-wide text-subtle">
            Interactions
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <ControlChip
              active={config.canReorder}
              onClick={() => patch({ canReorder: !config.canReorder })}
            >
              Reorder
            </ControlChip>
            <ControlChip
              active={config.deleteOnHover}
              onClick={() => patch({ deleteOnHover: !config.deleteOnHover })}
            >
              Delete on hover
            </ControlChip>
            <ControlChip
              active={config.sticky}
              onClick={() => patch({ sticky: !config.sticky })}
            >
              Sticky
            </ControlChip>
            <ControlChip
              active={config.pillsOverflowScroll}
              onClick={() =>
                patch({ pillsOverflowScroll: !config.pillsOverflowScroll })
              }
            >
              Overflow scroll
            </ControlChip>
            <ControlChip
              active={config.showSeparator}
              onClick={() => patch({ showSeparator: !config.showSeparator })}
            >
              Separator
            </ControlChip>
            <ControlChip
              active={config.showAddGroup}
              onClick={() => patch({ showAddGroup: !config.showAddGroup })}
            >
              Add group
            </ControlChip>
            <ControlChip
              active={config.showSort}
              onClick={() => patch({ showSort: !config.showSort })}
            >
              Sort
            </ControlChip>
            <ControlChip
              active={config.showRefresh}
              onClick={() => patch({ showRefresh: !config.showRefresh })}
            >
              Refresh
            </ControlChip>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">
              Select mode
            </span>
            <div className="flex flex-wrap gap-1.5">
              <ControlChip
                active={config.selectMode === "click"}
                onClick={() => patch({ selectMode: "click" })}
              >
                Click
              </ControlChip>
              <ControlChip
                active={config.selectMode === "hover"}
                onClick={() => patch({ selectMode: "hover" })}
              >
                Hover
              </ControlChip>
            </div>
          </div>

          <NumberField
            label="Hover transition (ms)"
            value={config.hoverTransitionMs}
            min={0}
            max={400}
            step={10}
            onChange={(n) => patch({ hoverTransitionMs: n })}
          />
          <NumberField
            label="Drag scale"
            value={config.dragScale}
            min={1}
            max={1.2}
            step={0.01}
            onChange={(n) => patch({ dragScale: n })}
          />
          <NumberField
            label="Drag duration (s)"
            value={config.dragDurationS}
            min={0.1}
            max={0.8}
            step={0.01}
            onChange={(n) => patch({ dragDurationS: n })}
          />
          <NumberField
            label="Drag bounce"
            value={config.dragBounce}
            min={0}
            max={0.4}
            step={0.01}
            onChange={(n) => patch({ dragBounce: n })}
          />
          <NumberField
            label="Press scale"
            value={config.pressScale}
            min={0.9}
            max={1}
            step={0.01}
            onChange={(n) => patch({ pressScale: n })}
          />

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">
              Search
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["always", "Always"],
                  ["sm", "≥sm"],
                  ["md", "≥md"],
                  ["hidden", "Off"],
                ] as const
              ).map(([id, label]) => (
                <ControlChip
                  key={id}
                  active={config.searchVisibility === id}
                  onClick={() => patch({ searchVisibility: id })}
                >
                  {label}
                </ControlChip>
              ))}
            </div>
          </div>
          <NumberField
            label="Search width"
            value={config.searchWidth}
            min={72}
            max={220}
            onChange={(n) => patch({ searchWidth: n })}
          />

          <div className="flex flex-wrap gap-1.5 pt-1">
            <ControlChip
              active={config.respectReducedMotion}
              onClick={() =>
                patch({ respectReducedMotion: !config.respectReducedMotion })
              }
              tone="accent"
            >
              Reduced motion
            </ControlChip>
            <ControlChip
              active={config.flashSafe}
              onClick={() => patch({ flashSafe: !config.flashSafe })}
              tone="accent"
            >
              Flash safe
            </ControlChip>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-[4px] border border-border bg-surface p-3">
          <h3 className="font-mono text-[10px] uppercase tracking-wide text-subtle">
            Groups (comma-separated)
          </h3>
          <textarea
            value={groupsDraft}
            onChange={(e) => setGroupsDraft(e.target.value)}
            onBlur={applyGroupsDraft}
            rows={3}
            className="w-full resize-y rounded-[4px] border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground outline-none focus:border-border-strong"
          />
          <button
            type="button"
            onClick={applyGroupsDraft}
            className="self-start rounded-[4px] border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-muted hover:border-foreground/35 hover:text-foreground"
          >
            Apply groups
          </button>
        </section>

        <section className="flex flex-col gap-2 rounded-[4px] border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-mono text-[10px] uppercase tracking-wide text-subtle">
              Dev prompt
            </h3>
            <span className="font-mono text-[10px] tabular-nums text-subtle">
              {diffs.length} change{diffs.length === 1 ? "" : "s"}
            </span>
          </div>

          {diffs.length === 0 ? (
            <p className="text-[12px] text-subtle">
              Change a control to generate a copyable implementation prompt.
            </p>
          ) : (
            <>
              <ul className="max-h-36 space-y-1 overflow-y-auto text-[11px] text-muted">
                {diffs.map((d) => (
                  <li key={d.key} className="font-mono leading-snug">
                    <span className="text-foreground">{d.key}</span>: {d.from} →{" "}
                    {d.to}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void copyPrompt()}
                className="inline-flex items-center justify-center gap-1.5 rounded-[4px] bg-pill-active px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-wide text-pill-active-fg transition hover:opacity-90"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" strokeWidth={2} aria-hidden />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" strokeWidth={2} aria-hidden />
                    Copy prompt
                  </>
                )}
              </button>
              <pre className="max-h-48 overflow-auto rounded-[4px] border border-border bg-background p-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-subtle">
                {prompt}
              </pre>
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
