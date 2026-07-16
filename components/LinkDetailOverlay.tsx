"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import type { LinkApiRow } from "@/lib/links";
import { formatRelativeTime, linkHostname, requiresLoginPlaceholder } from "@/lib/links";
import { brandThumbnailInvertInDark } from "@/lib/link-providers";
import { getProxiedImageUrl } from "@/lib/screenshot";

type GroupOption = { id: string; name: string };

type Props = {
  link: LinkApiRow;
  groupName: string | null;
  groups: GroupOption[];
  originRect: DOMRect | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDelete: (id: string) => void;
  onMove: (link: LinkApiRow, groupId: string) => void;
  onCopy: (link: LinkApiRow) => void;
  hasPrev: boolean;
  hasNext: boolean;
};

export default function LinkDetailOverlay({
  link,
  groupName,
  groups,
  originRect,
  onClose,
  onPrev,
  onNext,
  onDelete,
  onMove,
  onCopy,
  hasPrev,
  hasNext,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const closingRef = useRef(false);
  const hasOpenedRef = useRef(false);
  const previousLinkIdRef = useRef(link.id);
  const keyboardNavigationRef = useRef(false);
  const host = linkHostname(link.url);

  const animateClose = useCallback((keyboardInitiated = false) => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (keyboardInitiated) {
      onClose();
      return;
    }

    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    const stage = stageRef.current;
    if (!backdrop || !panel || !stage) {
      onClose();
      return;
    }

    const reduceMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => onClose(),
    });

    if (reduceMotion) {
      tl.to([panel, stage, backdrop], { opacity: 0, duration: 0.15 }, 0);
      return;
    }

    tl.to(
      panel,
      { transform: "translateX(-20px)", opacity: 0, duration: 0.2 },
      0,
    )
      .to(
        stage,
        { opacity: 0, transform: "scale(0.95)", duration: 0.2 },
        0,
      )
      .to(backdrop, { opacity: 0, duration: 0.22 }, 0);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        animateClose(true);
      } else if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        keyboardNavigationRef.current = true;
        onPrev();
      } else if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        keyboardNavigationRef.current = true;
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [animateClose, hasPrev, hasNext, onPrev, onNext]);

  useLayoutEffect(() => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    const stage = stageRef.current;
    if (!backdrop || !panel || !stage) return;

    const reduceMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (hasOpenedRef.current) {
      if (previousLinkIdRef.current === link.id) return;
      previousLinkIdRef.current = link.id;
      if (keyboardNavigationRef.current) {
        keyboardNavigationRef.current = false;
        gsap.set(stage, { opacity: 1 });
        return;
      }
      const tween = gsap.fromTo(
        stage,
        { opacity: reduceMotion ? 0.7 : 0.75 },
        {
          opacity: 1,
          duration: reduceMotion ? 0.1 : 0.16,
          ease: "power3.out",
        },
      );
      return () => tween.kill();
    }

    hasOpenedRef.current = true;
    previousLinkIdRef.current = link.id;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    gsap.set(backdrop, { opacity: 0 });
    gsap.set(
      panel,
      reduceMotion
        ? { opacity: 0 }
        : { transform: "translateX(-24px)", opacity: 0 },
    );

    if (reduceMotion) {
      gsap.set(stage, { opacity: 0 });
    } else if (originRect) {
      const stageBox = stage.getBoundingClientRect();
      const scaleX = originRect.width / Math.max(stageBox.width, 1);
      const scaleY = originRect.height / Math.max(stageBox.height, 1);
      const scale = Math.min(scaleX, scaleY, 1);
      const dx =
        originRect.left +
        originRect.width / 2 -
        (stageBox.left + stageBox.width / 2);
      const dy =
        originRect.top +
        originRect.height / 2 -
        (stageBox.top + stageBox.height / 2);
      gsap.set(stage, {
        opacity: 0.35,
        transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
        transformOrigin: "center center",
      });
    } else {
      gsap.set(stage, { opacity: 0, transform: "scale(0.95)" });
    }

    if (reduceMotion) {
      tl.to([backdrop, panel, stage], { opacity: 1, duration: 0.15 }, 0);
    } else {
      tl.to(backdrop, { opacity: 1, duration: 0.24 }, 0)
        .to(
          panel,
          { transform: "translateX(0px)", opacity: 1, duration: 0.28 },
          0.02,
        )
        .to(
          stage,
          {
            opacity: 1,
            transform: "translate(0px, 0px) scale(1)",
            duration: 0.3,
          },
          0.04,
        );
    }

    return () => {
      tl.kill();
    };
  }, [link.id, originRect]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      className="mind-overlay fixed inset-0 z-[80] flex"
      role="dialog"
      aria-modal="true"
      aria-label={link.display_title}
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/70 backdrop-blur-xl"
        onClick={() => animateClose()}
      />

      <aside
        ref={panelRef}
        className="mind-overlay-panel relative z-10 flex h-full w-full max-w-[292px] shrink-0 flex-col border-r border-border bg-surface/95 shadow-sm"
      >
        <div className="flex items-center gap-1 px-3 pt-3 pb-2">
          <button
            type="button"
            onClick={() => animateClose()}
            className="flex size-8 items-center justify-center rounded-full text-subtle transition hover:bg-pill hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
          <button
            type="button"
            disabled={!hasPrev}
            onClick={onPrev}
            className="flex size-8 items-center justify-center rounded-full text-subtle transition hover:bg-pill disabled:opacity-30"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={onNext}
            className="flex size-8 items-center justify-center rounded-full text-subtle transition hover:bg-pill disabled:opacity-30"
            aria-label="Next"
          >
            ›
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groupName ? (
            <p className="text-[11px] font-medium tracking-wide text-subtle uppercase">
              {groupName}
            </p>
          ) : null}
          <h2 className="mt-2 text-[22px] leading-tight font-semibold tracking-tight text-foreground">
            {link.display_title}
          </h2>

          <div className="mt-3 flex items-center gap-2">
            {link.favicon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getProxiedImageUrl(link.favicon_url)}
                alt=""
                width={18}
                height={18}
                className="size-[18px] rounded object-contain"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <span className="text-sm font-medium text-muted">{host}</span>
          </div>

          {link.description ? (
            <p className="mt-4 text-[13px] leading-relaxed text-subtle">
              {link.description}
            </p>
          ) : null}

          <dl className="mt-6 space-y-0 border-t border-border">
            <div className="flex items-start justify-between gap-3 border-b border-border py-3">
              <dt className="shrink-0 text-[12px] text-subtle">Source</dt>
              <dd className="min-w-0 text-right text-[12px] break-all text-muted">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground hover:underline"
                >
                  {link.url}
                </a>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border py-3">
              <dt className="text-[12px] text-subtle">Saved</dt>
              <dd className="text-[12px] text-muted">
                {formatRelativeTime(link.created_at)}
              </dd>
            </div>
            {link.tags.length ? (
              <div className="flex items-start justify-between gap-3 border-b border-border py-3">
                <dt className="shrink-0 text-[12px] text-subtle">Tags</dt>
                <dd className="flex flex-wrap justify-end gap-1">
                  {link.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-pill px-2 py-0.5 text-[11px] text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5 flex flex-col gap-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-pill-active px-3 py-2 text-sm font-medium text-pill-active-fg hover:opacity-90"
            >
              Open link
            </a>
            <button
              type="button"
              onClick={() => onCopy(link)}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-pill hover:text-foreground"
            >
              Copy URL
            </button>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-subtle">
              Move to group
              <select
                value={link.groupId}
                onChange={(e) => onMove(link, e.target.value)}
                className="rounded-lg border border-border bg-surface-elevated px-2 py-2 text-sm text-foreground"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                onDelete(link.id);
                animateClose();
              }}
              className="rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
            >
              Delete
            </button>
          </div>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 items-center justify-center p-6 md:p-10">
        <div
          ref={stageRef}
          className="mind-overlay-stage max-h-[min(82vh,900px)] max-w-[min(90vw,920px)] overflow-hidden rounded-2xl bg-surface-elevated shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getProxiedImageUrl(link.image_url)}
            alt={link.display_title}
            referrerPolicy="no-referrer"
            className={`block max-h-[min(82vh,900px)] w-auto max-w-full object-contain ${
              !requiresLoginPlaceholder(link.url) && brandThumbnailInvertInDark(link.url) ? "invert" : ""
            }`}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
