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
import NumberPopIn from "@/components/NumberPopIn";
import {
  ColorField,
  ControlSection,
  RangeField,
  SegmentedControl,
  StudioButton,
  ToggleField,
} from "@/components/ui/studio-controls";
import {
  DEFAULT_SCREEN_CONFIG,
  emptyPainted,
  resizePainted,
  type DigitalScreenConfig,
  type DigitalScreenContentMode,
} from "@/lib/digital-screen";

type PaintTool = "paint" | "erase" | "toggle";

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
      <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:w-[300px] lg:overflow-y-auto">
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
          <StudioButton
            onClick={resetAll}
            title="Reset all"
            aria-label="Reset all"
            className="size-7 shrink-0 p-0"
          >
            <RotateCcw className="size-3.5" strokeWidth={2} aria-hidden />
          </StudioButton>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <ControlSection title="Grid">
            <RangeField
              label="Columns"
              value={config.cols}
              min={8}
              max={96}
              onChange={(cols) => setGridSize(cols, config.rows)}
            />
            <RangeField
              label="Rows"
              value={config.rows}
              min={5}
              max={32}
              onChange={(rows) => setGridSize(config.cols, rows)}
            />
            <RangeField
              label="Cell size"
              value={config.cellSize}
              min={4}
              max={24}
              unit="px"
              onChange={(cellSize) => patch({ cellSize })}
            />
            <RangeField
              label="Dot padding"
              value={Number(config.cellPaddingRatio.toFixed(2))}
              min={0.05}
              max={0.42}
              step={0.01}
              onChange={(cellPaddingRatio) => patch({ cellPaddingRatio })}
            />
          </ControlSection>

          <ControlSection title="Frame">
            <RangeField
              label="Frame padding"
              value={config.framePadding}
              min={0}
              max={24}
              unit="px"
              onChange={(framePadding) => patch({ framePadding })}
            />
            <RangeField
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
            <ToggleField
              label="Vicinity stroke"
              checked={config.showStroke}
              onChange={(showStroke) => patch({ showStroke })}
            />
          </ControlSection>

          <ControlSection title="Colors">
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
          </ControlSection>

          <ControlSection title="Glow">
            <ToggleField
              label="Enable glow"
              checked={config.glow}
              onChange={(glow) => patch({ glow })}
            />
            <RangeField
              label="Glow blur"
              value={Number(config.glowBlur.toFixed(1))}
              min={0}
              max={3}
              step={0.1}
              onChange={(glowBlur) => patch({ glowBlur })}
            />
            <ToggleField
              label="Hot highlight"
              checked={config.glowHighlight}
              onChange={(glowHighlight) => patch({ glowHighlight })}
            />
          </ControlSection>

          <ControlSection title="Content">
            <SegmentedControl
              ariaLabel="Content mode"
              value={config.contentMode}
              options={MODE_OPTIONS}
              onChange={(contentMode) => patch({ contentMode })}
            />

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
                <RangeField
                  label="Scroll speed"
                  value={Number(config.marqueeSpeed.toFixed(2))}
                  min={-2}
                  max={2}
                  step={0.05}
                  onChange={(marqueeSpeed) => patch({ marqueeSpeed })}
                />
                <RangeField
                  label="FPS"
                  value={config.fps}
                  min={8}
                  max={60}
                  onChange={(fps) => patch({ fps })}
                />
                <RangeField
                  label="Letter spacing"
                  value={config.charSpacing}
                  min={0}
                  max={6}
                  onChange={(charSpacing) => patch({ charSpacing })}
                />
              </div>
            )}
          </ControlSection>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            ariaLabel="Screen mode"
            value={editing ? "paint" : "preview"}
            options={[
              { id: "paint", label: "Paint mode" },
              { id: "preview", label: "Preview" },
            ]}
            onChange={(mode) => setEditing(mode === "paint")}
          />

          <p className="font-mono text-[11px] text-subtle tabular-nums flex items-baseline gap-0.5">
            <NumberPopIn>{config.cols}</NumberPopIn>
            <span>×</span>
            <NumberPopIn>{config.rows}</NumberPopIn>
            <span className="mx-1">·</span>
            <NumberPopIn>{pixelSize.w}</NumberPopIn>
            <span>×</span>
            <NumberPopIn>{pixelSize.h}</NumberPopIn>
            <span>px</span>
          </p>
        </div>

        {canPaint ? (
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              ariaLabel="Paint tool"
              value={tool}
              options={TOOL_OPTIONS.map((option) => {
                const Icon = option.icon;
                return {
                  ...option,
                  icon: <Icon className="size-3.5" strokeWidth={2} aria-hidden />,
                };
              })}
              onChange={setTool}
            />
            <StudioButton onClick={clearPaint}>Clear paint</StudioButton>
            <span className="text-[12px] text-subtle">
              Drag on the screen to draw
            </span>
          </div>
        ) : null}

        <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-2xl border border-border bg-studio-stage p-6 sm:p-10">
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
