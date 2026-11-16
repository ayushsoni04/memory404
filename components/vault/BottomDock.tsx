"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Contrast,
  Menu,
  MousePointer,
  MousePointer2,
  Palette,
  Search,
  Volume2,
  VolumeX,
} from "lucide-react";
import { applyArtStyle, type ArtStyle } from "@/lib/art-style";
import { useArtStyle } from "@/lib/use-art-style";
import {
  getCustomCursorEnabled,
  setCustomCursorEnabled,
  subscribeCustomCursor,
} from "@/lib/cursor-pref";
import { anotherDialogIsOpen } from "@/lib/palette-shortcut";
import { getSoundsEnabled, playUiSound, setSoundsEnabled } from "@/lib/ui-sound";
import "./bottom-dock.css";

type Option<T extends string> = { value: T; label: string; icon: ReactNode };

/** A row of icon choices in a pill track; the active one sits on a raised chip. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-[14px] text-muted">{label}</span>
      <div role="radiogroup" aria-label={label} className="dock-segmented">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(o.value)}
            className="dock-segment"
          >
            {o.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Floating dock at the bottom of the feed: Search (opens the ⌘K palette) and a
 * menu with display settings.
 */
export function BottomDock({ onOpenSearch }: { onOpenSearch: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const art = useArtStyle();
  const cursorOn = useSyncExternalStore(subscribeCustomCursor, getCustomCursorEnabled, () => true);
  const [soundOn, setSoundOn] = useState(true);
  const shortcut =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const iconCls = "size-[18px]";

  return (
    <div ref={rootRef} className="bottom-dock">
      {open ? (
        <div className="dock-panel" role="dialog" aria-label="Display settings">
          <Segmented<ArtStyle>
            label="Colour"
            value={art}
            onChange={(v) => {
              applyArtStyle(v);
              playUiSound("toggle");
            }}
            options={[
              { value: "signal", label: "Colour", icon: <Palette className={iconCls} strokeWidth={1.6} /> },
              { value: "mono", label: "Mono", icon: <Contrast className={iconCls} strokeWidth={1.6} /> },
            ]}
          />
          <Segmented<"off" | "on">
            label="Sound"
            value={soundOn ? "on" : "off"}
            onChange={(v) => {
              const on = v === "on";
              setSoundsEnabled(on);
              setSoundOn(on);
              if (on) playUiSound("toggle");
            }}
            options={[
              { value: "off", label: "Sound off", icon: <VolumeX className={iconCls} strokeWidth={1.6} /> },
              { value: "on", label: "Sound on", icon: <Volume2 className={iconCls} strokeWidth={1.6} /> },
            ]}
          />
          <hr className="border-white/10" />
          <Segmented<"system" | "custom">
            label="Custom cursor"
            value={cursorOn ? "custom" : "system"}
            onChange={(v) => {
              setCustomCursorEnabled(v === "custom");
              playUiSound("toggle");
            }}
            options={[
              { value: "system", label: "System cursor", icon: <MousePointer className={iconCls} strokeWidth={1.6} /> },
              { value: "custom", label: "Custom cursor", icon: <MousePointer2 className={iconCls} strokeWidth={1.6} /> },
            ]}
          />
        </div>
      ) : null}

      <div className="dock-pill">
        <button
          type="button"
          onClick={() => {
            if (anotherDialogIsOpen()) return;
            onOpenSearch();
            playUiSound("tick");
          }}
          aria-keyshortcuts="Control+K Meta+K"
          className="dock-button gap-2 ps-4 pe-3"
        >
          <Search className="size-4" strokeWidth={1.8} aria-hidden />
          <span>Search</span>
          <kbd suppressHydrationWarning className="font-mono text-[10px] text-subtle">
            {shortcut}
          </kbd>
        </button>
        <span className="h-5 w-px bg-white/15" aria-hidden />
        <button
          type="button"
          aria-label="Display settings"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            if (!open) setSoundOn(getSoundsEnabled());
            setOpen(!open);
          }}
          className="dock-button px-3"
        >
          <Menu className="size-4" strokeWidth={1.8} aria-hidden />
        </button>
      </div>
    </div>
  );
}
