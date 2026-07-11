"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eraser,
  Grid3x3,
  Paintbrush,
  RotateCcw,
  Type,
} from "lucide-react";
import { DigitalScreen } from "@/components/DigitalScreen";
import {
  DEFAULT_SCREEN_CONFIG,
  emptyPainted,
  resizePainted,
  type DigitalScreenConfig,
  type DigitalScreenContentMode,
} from "@/lib/digital-screen";
import { cn } from "@/lib/utils";

type PaintTool = "paint" | "erase" | "toggle";

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-foreground tabular-nums">
          {value}
          {unit ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-pill accent-foreground"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-[12px]">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[5.5rem] rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:border-border-strong"
        />
      </span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <h2 className="font-mono text-[11px] tracking-[0.14em] text-subtle uppercase">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const MODE_OPTIONS: { id: DigitalScreenContentMode; label: string }[] = [
  { id: "marquee", label: "Marquee" },
  { id: "paint", label: "Paint" },
  { id: "both", label: "Both" },
];

const TOOL_OPTIONS: { id: PaintTool; label: string; icon: typeof Paintbrush }[] =
  [
    { id: "paint", label: "Paint", icon: Paintbrush },
    { id: "erase", label: "Erase", icon: Eraser },
    { id: "toggle", label: "Toggle", icon: Grid3x3 },
  ];

export function ScreenWorkspace() {
  const [config, setConfig] = useState<DigitalScreenConfig>(DEFAULT_SCREEN_CONFIG);
  const [tool, setTool] = useState<PaintTool>("paint");
  const [editing, setEditing] = useState(true);

  const patch = useCallback((partial: Partial<DigitalScreenConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const setGridSize = useCallback((cols: number, rows: number) => {
    setConfig((prev) => ({
      ...prev,
      cols,
      rows,
      painted: resizePainted(prev.painted, prev.cols, prev.rows, cols, rows),
    }));
  }, []);

  const clearPaint = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      painted: emptyPainted(prev.cols, prev.rows),
    }));
  }, []);

  const resetAll = useCallback(() => {
    setConfig(DEFAULT_SCREEN_CONFIG);
    setTool("paint");
  }, []);

  const canPaint =
    editing &&
    (config.contentMode === "paint" || config.contentMode === "both");

  const pixelSize = useMemo(
    () => ({
      w: config.cols * config.cellSize,
      h: config.rows * config.cellSize,
    }),
    [config.cols, config.rows, config.cellSize],
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[var(--content-max)] flex-col gap-6 p-4 lg:flex-row lg:gap-8">
      <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-[300px] lg:overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden />
              Vault
            </Link>
            <h1 className="font-mono text-lg tracking-tight text-foreground">
              Screen studio
            </h1>
            <p className="mt-1 text-[13px] leading-snug text-muted">
              Configure LED screens like the loader — size, dots, frame, and
              paint your own pixels.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAll}
            title="Reset all"
            aria-label="Reset all"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-transparent bg-pill text-muted transition-colors hover:bg-pill-hover hover:text-foreground"
          >
            <RotateCcw className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <Section title="Grid">
            <SliderField
              label="Columns"
              value={config.cols}
              min={8}
              max={96}
              onChange={(cols) => setGridSize(cols, config.rows)}
            />
            <SliderField
              label="Rows"
              value={config.rows}
              min={5}
              max={32}
              onChange={(rows) => setGridSize(config.cols, rows)}
            />
            <SliderField
              label="Cell size"
              value={config.cellSize}
              min={4}
              max={24}
              unit="px"
              onChange={(cellSize) => patch({ cellSize })}
            />
            <SliderField
              label="Dot padding"
              value={Number(config.cellPaddingRatio.toFixed(2))}
              min={0.05}
              max={0.42}
              step={0.01}
              onChange={(cellPaddingRatio) => patch({ cellPaddingRatio })}
            />
          </Section>

          <Section title="Frame">
            <SliderField
              label="Frame padding"
              value={config.framePadding}
              min={0}
              max={24}
              unit="px"
              onChange={(framePadding) => patch({ framePadding })}
            />
            <SliderField
              label="Corner radius"
              value={config.frameRadius}
              min={0}
              max={32}
              unit="px"
              onChange={(frameRadius) => patch({ frameRadius })}
            />
            <ColorField
              label="Frame"
              value={config.frameBg}
              onChange={(frameBg) => patch({ frameBg })}
            />
            <label className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-muted">Vicinity stroke</span>
              <input
                type="checkbox"
                checked={config.showStroke}
                onChange={(e) => patch({ showStroke: e.target.checked })}
                className="size-4 accent-foreground"
              />
            </label>
          </Section>

          <Section title="Colors">
            <ColorField
              label="Background"
              value={config.background}
              onChange={(background) => patch({ background })}
            />
            <ColorField
              label="Inactive dots"
              value={config.inactive}
              onChange={(inactive) => patch({ inactive })}
            />
            <ColorField
              label="Active dots"
              value={config.active}
              onChange={(active) => patch({ active })}
            />
          </Section>

          <Section title="Glow">
            <label className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-muted">Enable glow</span>
              <input
                type="checkbox"
                checked={config.glow}
                onChange={(e) => patch({ glow: e.target.checked })}
                className="size-4 accent-foreground"
              />
            </label>
            <SliderField
              label="Glow blur"
              value={Number(config.glowBlur.toFixed(1))}
              min={0}
              max={3}
              step={0.1}
              onChange={(glowBlur) => patch({ glowBlur })}
            />
            <label className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-muted">Hot highlight</span>
              <input
                type="checkbox"
                checked={config.glowHighlight}
                onChange={(e) => patch({ glowHighlight: e.target.checked })}
                className="size-4 accent-foreground"
              />
            </label>
          </Section>

          <Section title="Content">
            <div className="flex flex-wrap gap-1.5">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patch({ contentMode: opt.id })}
                  className={cn(
                    "inline-flex h-7 items-center rounded-full px-2.5 text-[12px] transition-colors",
                    config.contentMode === opt.id
                      ? "bg-pill-active text-pill-active-fg"
                      : "bg-pill text-muted hover:bg-pill-hover hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {(config.contentMode === "marquee" ||
              config.contentMode === "both") && (
              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[12px] text-muted">
                    <Type className="size-3.5" strokeWidth={2} aria-hidden />
                    Marquee text
                  </span>
                  <input
                    type="text"
                    value={config.marqueeText}
                    onChange={(e) => patch({ marqueeText: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[13px] text-foreground outline-none focus:border-border-strong"
                    placeholder="LOADING"
                  />
                </label>
                <SliderField
                  label="Scroll speed"
                  value={Number(config.marqueeSpeed.toFixed(2))}
                  min={-2}
                  max={2}
                  step={0.05}
                  onChange={(marqueeSpeed) => patch({ marqueeSpeed })}
                />
                <SliderField
                  label="FPS"
                  value={config.fps}
                  min={8}
                  max={60}
                  onChange={(fps) => patch({ fps })}
                />
                <SliderField
                  label="Letter spacing"
                  value={config.charSpacing}
                  min={0}
                  max={6}
                  onChange={(charSpacing) => patch({ charSpacing })}
                />
              </div>
            )}
          </Section>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={cn(
                "inline-flex h-7 items-center rounded-full px-2.5 text-[12px] transition-colors",
                editing
                  ? "bg-pill-active text-pill-active-fg"
                  : "bg-pill text-muted hover:bg-pill-hover",
              )}
            >
              Paint mode
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={cn(
                "inline-flex h-7 items-center rounded-full px-2.5 text-[12px] transition-colors",
                !editing
                  ? "bg-pill-active text-pill-active-fg"
                  : "bg-pill text-muted hover:bg-pill-hover",
              )}
            >
              Preview
            </button>
          </div>

          <p className="font-mono text-[11px] text-subtle tabular-nums">
            {config.cols}×{config.rows} · {pixelSize.w}×{pixelSize.h}px
          </p>
        </div>

        {canPaint ? (
          <div className="flex flex-wrap items-center gap-2">
            {TOOL_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTool(opt.id)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors",
                    tool === opt.id
                      ? "bg-pill-active text-pill-active-fg"
                      : "bg-pill text-muted hover:bg-pill-hover hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={2} aria-hidden />
                  {opt.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={clearPaint}
              className="inline-flex h-7 items-center rounded-full bg-pill px-2.5 text-[12px] text-muted transition-colors hover:bg-pill-hover hover:text-foreground"
            >
              Clear paint
            </button>
            <span className="text-[12px] text-subtle">
              Drag on the screen to draw
            </span>
          </div>
        ) : null}

        <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-2xl border border-border bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03),transparent_65%),#0a0a0a] p-6 sm:p-10">
          <DigitalScreen
            config={config}
            interactive={canPaint}
            paintMode={tool}
            onPaintChange={(painted) => patch({ painted })}
            label="Configurable digital screen"
            className="shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(0,0,0,0.55)]"
          />
        </div>

        <p className="text-[12px] leading-relaxed text-subtle">
          Tip: switch content to <span className="text-muted">Paint</span> or{" "}
          <span className="text-muted">Both</span>, enable Paint mode, then draw
          on the matrix. Preview disables painting so you can judge the finished
          screen.
        </p>
      </main>
    </div>
  );
}
