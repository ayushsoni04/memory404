"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import {
  Download,
  FlaskConical,
  MousePointer,
  MousePointer2,
  Search,
  Volume2,
  Settings,
  Trash2,
  VolumeX,
} from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { EXTENSION_VERSION, EXTENSION_ZIP_FILENAME, EXTENSION_ZIP_HREF } from "@/lib/extension-download";
import type { LibraryLayout } from "@/lib/layout-pref";
import type { GridSize } from "./types";
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

type Me = { name: string | null; username: string | null; avatarUrl: string | null };

/** The signed-in person's name and photo, refreshed when the profile changes. */
function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data.user) setMe(data.user as Me);
      } catch {
        /* the initial stays */
      }
    };
    void load();
    window.addEventListener("m404:profile-updated", load);
    return () => {
      alive = false;
      window.removeEventListener("m404:profile-updated", load);
    };
  }, []);
  return me;
}

function initialOf(me: Me | null): string {
  const source = me?.name?.trim() || me?.username?.trim() || "";
  return source ? source[0].toUpperCase() : "M";
}

/**
 * The feed's top bar, after designeer.xyz/finds.
 * - "bar" layout (no sidebar): logo on the left, Search in the middle, the
 *   profile photo on the right. The photo opens a menu with everything the
 *   sidebar used to hold: grid size, pages, the extension and settings.
 * - "sidebar" layout: page links on the left, Search, and a settings gear.
 */
export function BottomDock({
  onOpenSearch,
  isOwner = false,
  layout = "sidebar",
  gridSize,
  setGridSize,
}: {
  onOpenSearch: () => void;
  isOwner?: boolean;
  layout?: LibraryLayout;
  gridSize?: GridSize;
  setGridSize?: (next: GridSize) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cursorOn = useSyncExternalStore(subscribeCustomCursor, getCustomCursorEnabled, () => true);
  const [soundOn, setSoundOn] = useState(true);
  const me = useMe();
  const bar = layout === "bar";
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
  const toggleMenu = () => {
    if (!open) setSoundOn(getSoundsEnabled());
    setOpen(!open);
  };

  return (
    <div ref={rootRef} className="feed-topbar" data-layout={layout}>
      {bar ? (
        <Wordmark className="topbar-logo" />
      ) : (
        <nav aria-label="Pages" className="topbar-nav">
          <Link href="/" aria-current="page" className="topbar-link topbar-link-active">
            Library
          </Link>
          {isOwner ? (
            <Link href="/workspace" className="topbar-link">
              Workspace
            </Link>
          ) : null}
          <Link href="/trash" className="topbar-link">
            Trash
          </Link>
        </nav>
      )}

      <button
        type="button"
        onClick={() => {
          if (anotherDialogIsOpen()) return;
          onOpenSearch();
          playUiSound("tick");
        }}
        aria-keyshortcuts="Control+K Meta+K"
        className="topbar-search"
      >
        <Search className="size-[14px]" strokeWidth={2} aria-hidden />
        <span>Search</span>
        <kbd suppressHydrationWarning className="topbar-kbd">
          {shortcut}
        </kbd>
      </button>

      <div className="topbar-actions">
        {bar ? (
          <button
            type="button"
            aria-label="Profile and settings"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={toggleMenu}
            className="topbar-avatar"
          >
            {me?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URLs and remote avatars
              <img src={me.avatarUrl} alt="" className="size-full rounded-full object-cover" />
            ) : (
              <span aria-hidden>{initialOf(me)}</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            aria-label="Display settings"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={toggleMenu}
            className="topbar-icon"
          >
            <Settings className="size-[15px]" strokeWidth={1.8} aria-hidden />
          </button>
        )}
      </div>

      {open ? (
        <div
          className="dock-panel topbar-panel"
          role="dialog"
          aria-label={bar ? "Profile and settings" : "Display settings"}
        >
          {bar ? (
            <>
              <div className="flex items-center gap-3">
                <span className="topbar-avatar topbar-avatar-lg" aria-hidden>
                  {me?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URLs and remote avatars
                    <img src={me.avatarUrl} alt="" className="size-full rounded-full object-cover" />
                  ) : (
                    initialOf(me)
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] font-medium text-foreground">
                    {me?.name || "Your profile"}
                  </span>
                  <span className="truncate text-[12px] text-subtle">
                    {me?.username ? `@${me.username}` : "Add photo & details"}
                  </span>
                </span>
              </div>
              <hr className="border-white/10" />
              {gridSize && setGridSize ? (
                <Segmented<GridSize>
                  label="Card size"
                  value={gridSize}
                  onChange={(v) => {
                    setGridSize(v);
                    playUiSound("toggle");
                  }}
                  options={[
                    { value: "compact", label: "Small cards", icon: <span className="text-[12px] font-semibold">S</span> },
                    { value: "default", label: "Medium cards", icon: <span className="text-[12px] font-semibold">M</span> },
                    { value: "large", label: "Large cards", icon: <span className="text-[12px] font-semibold">L</span> },
                  ]}
                />
              ) : null}
            </>
          ) : null}
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
          {bar ? (
            <>
              <hr className="border-white/10" />
              <nav aria-label="Pages" className="flex flex-col">
                {isOwner ? (
                  <Link href="/workspace" className="topbar-menu-link">
                    <FlaskConical className="size-4" strokeWidth={1.7} aria-hidden />
                    Workspace
                  </Link>
                ) : null}
                <Link href="/trash" className="topbar-menu-link">
                  <Trash2 className="size-4" strokeWidth={1.7} aria-hidden />
                  Trash
                </Link>
                <a href={EXTENSION_ZIP_HREF} download={EXTENSION_ZIP_FILENAME} className="topbar-menu-link">
                  <Download className="size-4" strokeWidth={1.7} aria-hidden />
                  Extension
                  <span className="ms-auto text-[11px] text-subtle">{EXTENSION_VERSION}</span>
                </a>
                <Link href="/settings" className="topbar-menu-link">
                  <Settings className="size-4" strokeWidth={1.7} aria-hidden />
                  Settings
                </Link>
              </nav>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
