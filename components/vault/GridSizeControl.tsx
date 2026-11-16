"use client";

import {
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { playUiSound } from "@/lib/ui-sound";
import { nextGridSize } from "./grid-size";
import { GRID_SIZES, type GridSize } from "./types";
import "./grid-dial-actions.css";

/** Dial geometry in SVG units (1 unit = 1 CSS px). */
const VB_W = 132;
const VB_H = 104;
const CX = VB_W / 2;
const CY = 68;
const R_IN = 41;
const R_OUT = 62;
const R_LABEL = (R_IN + R_OUT) / 2;
/** Angle of each size, in degrees from straight up (clockwise). */
const STOP_DEG = [-52, 0, 52];
const HALF_SEG = 24;
const KNOB = 58;
const WELL = 70;

const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
const pt = (r: number, deg: number) => [CX + r * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))];

/** Annular sector between two angles. */
function segmentPath(from: number, to: number): string {
  const [ax, ay] = pt(R_OUT, from);
  const [bx, by] = pt(R_OUT, to);
  const [cx, cy] = pt(R_IN, to);
  const [dx, dy] = pt(R_IN, from);
  return [
    `M${ax} ${ay}`,
    `A${R_OUT} ${R_OUT} 0 0 1 ${bx} ${by}`,
    `L${cx} ${cy}`,
    `A${R_IN} ${R_IN} 0 0 0 ${dx} ${dy}`,
    "Z",
  ].join(" ");
}

/** A shortcut on the lower arc of the dial (Workspace, Download, Trash…). */
export type DialAction = {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  /** Set for a file download (the extension zip). */
  download?: string;
  /** Accept dragged links/groups (the Trash shortcut). */
  onDropLink?: (linkId: string) => void;
  onDropGroup?: (groupId: string) => void;
};

/** Lower-arc angles (degrees from straight up, clockwise) for 1–4 actions. */
function lowerStops(n: number): number[] {
  if (n <= 1) return [180];
  const spread = Math.min(52, 104 / (n - 1));
  const first = 180 + (spread * (n - 1)) / 2;
  return Array.from({ length: n }, (_, i) => first - i * spread);
}

/** Extra height (SVG units) the lower arc needs below the slider. */
const LOWER_EXTRA = CY + R_OUT + 4 - VB_H;

/** Dot-grid glyph: denser for smaller cards. */
function GridGlyph({ size }: { size: GridSize }) {
  const n = size === "compact" ? 4 : size === "default" ? 3 : 2;
  const cell = 14 / n;
  return (
    <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
      {Array.from({ length: n * n }, (_, i) => (
        <rect
          key={i}
          x={(i % n) * cell + cell * 0.14}
          y={Math.floor(i / n) * cell + cell * 0.14}
          width={cell * 0.72}
          height={cell * 0.72}
          rx={cell * 0.2}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/**
 * Grid size as a rotary dial: a raised knob in a recessed well, with S / M / L
 * segments on an arc around it. Turn the knob, click a segment, or use the
 * arrow keys.
 */
export function GridSizeControl({
  gridSize,
  setGridSizeAndPersist,
  actions = [],
}: {
  gridSize: GridSize;
  setGridSizeAndPersist: (size: GridSize) => void;
  /** Shortcuts on the lower arc; they fan out with the S / M / L arc. */
  actions?: DialAction[];
}) {
  const [dragOpen, setDragOpen] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeIndex = Math.max(0, GRID_SIZES.findIndex((s) => s.id === gridSize));
  const current = GRID_SIZES[activeIndex];
  /** Knob angle while turning by hand; null = rest on the active stop. */
  const [dragDeg, setDragDeg] = useState<number | null>(null);
  const angle = dragDeg ?? STOP_DEG[activeIndex];

  const commit = (next: GridSize) => {
    if (next === gridSize) return;
    setGridSizeAndPersist(next);
    playUiSound("toggle");
  };

  const angleFromPointer = (clientX: number, clientY: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return STOP_DEG[activeIndex];
    const scale = rect.width / VB_W;
    const x = (clientX - rect.left) / scale - CX;
    const y = (clientY - rect.top) / scale - CY;
    const deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    const wrapped = deg > 180 ? deg - 360 : deg;
    const min = STOP_DEG[0] - 10;
    const max = STOP_DEG[STOP_DEG.length - 1] + 10;
    return Math.min(max, Math.max(min, wrapped));
  };

  const nearestStop = (deg: number) => {
    let best = 0;
    STOP_DEG.forEach((s, i) => {
      if (Math.abs(s - deg) < Math.abs(STOP_DEG[best] - deg)) best = i;
    });
    return best;
  };

  const turnTo = (clientX: number, clientY: number) => {
    const deg = angleFromPointer(clientX, clientY);
    setDragDeg(deg);
    commit(GRID_SIZES[nearestStop(deg)].id);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    turnTo(event.clientX, event.clientY);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragDeg === null) return;
    turnTo(event.clientX, event.clientY);
  };

  const release = () => setDragDeg(null); // the knob springs onto the stop

  const stops = lowerStops(actions.length);
  const totalH = VB_H + (actions.length ? LOWER_EXTRA : 0);

  const acceptsDrop = (a: DialAction) => Boolean(a.onDropLink || a.onDropGroup);
  const onActionDragOver = (a: DialAction) => (event: ReactDragEvent) => {
    if (!acceptsDrop(a)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(a.id);
  };
  const onActionDrop = (a: DialAction) => (event: ReactDragEvent) => {
    if (!acceptsDrop(a)) return;
    event.preventDefault();
    setDropTarget(null);
    setDragOpen(false);
    const linkId = event.dataTransfer.getData("linkId");
    const groupId = event.dataTransfer.getData("groupId");
    if (linkId) a.onDropLink?.(linkId);
    if (groupId) a.onDropGroup?.(groupId);
    if (linkId || groupId) playUiSound("droplet");
  };

  return (
    <div
      className="grid-dial-wrap relative w-[132px] max-w-full"
      data-open={dragOpen || undefined}
      // Dragging a link over the dial opens it so Trash can take the drop.
      onDragEnter={() => setDragOpen(true)}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragOpen(false);
          setDropTarget(null);
        }
      }}
      onDrop={() => {
        setDragOpen(false);
        setDropTarget(null);
      }}
      style={{ aspectRatio: `${VB_W} / ${totalH}` }}
    >
    <div
      ref={rootRef}
      role="slider"
      tabIndex={0}
      aria-label="Grid size"
      aria-valuemin={0}
      aria-valuemax={GRID_SIZES.length - 1}
      aria-valuenow={activeIndex}
      aria-valuetext={current.title}
      title={current.title}
      data-turning={dragDeg !== null || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(event) => {
        const next = nextGridSize(gridSize, event.key);
        if (!next) return;
        event.preventDefault();
        commit(next);
      }}
      className="grid-dial absolute inset-x-0 top-0 w-full touch-none select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] cursor-grab data-[turning]:cursor-grabbing"
      style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
    >
      {/* The arc only fans out on hover, focus or while turning, like a game radial menu. */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="grid-dial-arc absolute inset-0 h-full w-full"
        style={{ "--dial-cx": `${CX}px`, "--dial-cy": `${CY}px` } as React.CSSProperties}
        aria-hidden
      >
        <defs>
          <pattern
            id="grid-dial-hatch"
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="4" fill="rgb(255 255 255 / 0.1)" />
            <line x1="0" y1="0" x2="0" y2="4" stroke="rgb(255 255 255 / 0.24)" strokeWidth="1.4" />
          </pattern>
        </defs>

        {/* Track behind the segments */}
        <path
          d={segmentPath(STOP_DEG[0] - HALF_SEG - 4, STOP_DEG[2] + HALF_SEG + 4)}
          className="grid-dial-track"
        />

        {GRID_SIZES.map((size, i) => {
          const active = i === activeIndex;
          const [lx, ly] = pt(R_LABEL, STOP_DEG[i]);
          return (
            <g
              key={size.id}
              className="grid-dial-item"
              style={{ "--i": i } as React.CSSProperties}
            >
              <path
                d={segmentPath(STOP_DEG[i] - HALF_SEG + 1.5, STOP_DEG[i] + HALF_SEG - 1.5)}
                className={active ? "grid-dial-seg grid-dial-seg-active" : "grid-dial-seg"}
                fill={active ? "url(#grid-dial-hatch)" : undefined}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                className={`grid-dial-label fill-current text-[10px] ${
                  active ? "font-semibold text-foreground" : "text-subtle"
                }`}
              >
                {size.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Recessed well, with the raised knob bulging out of it */}
      <span
        aria-hidden
        className="grid-dial-well pointer-events-none absolute rounded-full"
        style={{
          width: `${(WELL / VB_W) * 100}%`,
          aspectRatio: "1",
          left: `${((CX - WELL / 2) / VB_W) * 100}%`,
          top: `${((CY - WELL / 2) / VB_H) * 100}%`,
        }}
      >
        <span
          className="grid-dial-knob absolute rounded-full"
          style={{ inset: `${((WELL - KNOB) / 2 / WELL) * 100}%` }}
        >
          <span className="grid-dial-pointer absolute inset-0" style={{ rotate: `${angle}deg` }}>
            <span className="grid-dial-notch" />
          </span>
          <span className="grid-dial-glyph absolute inset-0 flex items-center justify-center text-muted">
            <GridGlyph size={gridSize} />
          </span>
          {/* Shown while the dial is open: the glyph turns into a close mark. */}
          <span className="grid-dial-close absolute inset-0 flex items-center justify-center text-foreground" aria-hidden>
            <svg viewBox="0 0 14 14" className="size-3.5">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
        </span>
      </span>
    </div>

    {actions.length ? (
      <>
        {/* Lower arc: one segment per shortcut, revealed with the S / M / L arc. */}
        <svg
          viewBox={`0 0 ${VB_W} ${totalH}`}
          className="grid-dial-arc pointer-events-none absolute inset-0 h-full w-full"
          style={{ "--dial-cx": `${CX}px`, "--dial-cy": `${CY}px` } as React.CSSProperties}
          aria-hidden
        >
          {actions.map((a, i) => (
            <path
              key={a.id}
              d={segmentPath(stops[i] - HALF_SEG + 1.5, stops[i] + HALF_SEG - 1.5)}
              className={`grid-dial-item grid-dial-seg${dropTarget === a.id ? " grid-dial-seg-drop" : ""}`}
              style={{ "--i": GRID_SIZES.length + i } as React.CSSProperties}
            />
          ))}
        </svg>
        {actions.map((a, i) => {
          const [x, y] = pt(R_LABEL, stops[i]);
          return (
            <a
              key={a.id}
              href={a.href}
              download={a.download}
              aria-label={a.label}
              title={a.label}
              onDragOver={onActionDragOver(a)}
              onDragLeave={() => setDropTarget((t) => (t === a.id ? null : t))}
              onDrop={onActionDrop(a)}
              data-drop={dropTarget === a.id || undefined}
              className="grid-dial-action absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-muted outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] data-[drop]:text-red-400"
              style={
                {
                  left: `${(x / VB_W) * 100}%`,
                  top: `${(y / totalH) * 100}%`,
                  "--i": GRID_SIZES.length + i,
                } as React.CSSProperties
              }
            >
              {a.icon}
            </a>
          );
        })}
      </>
    ) : null}
    </div>
  );
}
