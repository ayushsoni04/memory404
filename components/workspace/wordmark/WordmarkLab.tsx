"use client";

import { useState } from "react";
import { SprayWordmark } from "@/components/brand/SprayWordmark";
import { ControlChip } from "@/components/workspace/text-swap/controls";

/** Workspace lab: the spray-painted "memory 404" wordmark. */
export function WordmarkLab() {
  const [tone, setTone] = useState<"light" | "dark">("light");
  const [layout, setLayout] = useState<"stacked" | "line">("stacked");
  const [spray, setSpray] = useState(0.55);
  const [tilt, setTilt] = useState(-8);
  const [seed, setSeed] = useState(7);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border [container-type:inline-size]">
        <SprayWordmark
          tone={tone}
          layout={layout}
          spray={spray}
          tilt={tilt}
          seed={seed}
          className="aspect-square w-full sm:aspect-[16/10]"
        />
      </div>

      <section className="rounded-xl border border-border bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["light", "dark"] as const).map((t) => (
            <ControlChip key={t} active={tone === t} onClick={() => setTone(t)}>
              {t}
            </ControlChip>
          ))}
          <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
          <ControlChip active={layout === "stacked"} onClick={() => setLayout("stacked")}>
            Stacked
          </ControlChip>
          <ControlChip active={layout === "line"} onClick={() => setLayout("line")}>
            One line
          </ControlChip>
          <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
          <ControlChip active={false} onClick={() => setSeed((s) => s + 1)}>
            Re-spray
          </ControlChip>
        </div>
        <div className="mt-4 grid gap-4 border-t border-border pt-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between font-mono text-[10px] text-subtle">
              <span>Spray</span>
              <span className="tabular-nums text-foreground">{Math.round(spray * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={spray}
              onChange={(e) => setSpray(Number(e.target.value))}
              className="w-full accent-[#ff1d12]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between font-mono text-[10px] text-subtle">
              <span>Tilt</span>
              <span className="tabular-nums text-foreground">{tilt}°</span>
            </span>
            <input
              type="range"
              min={-20}
              max={10}
              step={1}
              value={tilt}
              onChange={(e) => setTilt(Number(e.target.value))}
              className="w-full accent-[#ff1d12]"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
