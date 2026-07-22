"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import type { LinkApiRow } from "@/lib/links";
import {
  formatRelativeTime,
  linkHostname,
  requiresLoginPlaceholder,
} from "@/lib/links";
import { brandThumbnailInvertInDark } from "@/lib/link-providers";
import { getFeedImageUrl, getProxiedImageUrl } from "@/lib/screenshot";
import MindCardActions from "@/components/vault/MindCardActions";

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
  hasPrev: boolean;
  hasNext: boolean;
};

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Shared-element morph timing — ease-in-out at 1.25× speed. */
const MORPH_SPEED = 1.25;
const MORPH_EASE = "power2.inOut";
const morphDuration = (seconds: number) => seconds / MORPH_SPEED;

function isJunkFavicon(url: string | null | undefined): boolean {
  if (!url) return true;
  return /dummyimage\.com|placehold\.|via\.placeholder/i.test(url);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function toRect(r: DOMRect | Rect): Rect {
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
  };
}

/** FLIP invert: place element at `to`, transform so it visually matches `from`. */
function flyInvertProps(from: Rect, to: Rect) {
  const sx = from.width / Math.max(to.width, 1);
  const sy = from.height / Math.max(to.height, 1);
  return {
    left: to.left,
    top: to.top,
    width: to.width,
    height: to.height,
    x: from.left - to.left,
    y: from.top - to.top,
    scaleX: sx,
    scaleY: sy,
    transformOrigin: "0 0",
    borderRadius: 4,
  };
}

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
  hasPrev,
  hasNext,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const flyRef = useRef<HTMLDivElement | null>(null);
  const chromeRef = useRef<HTMLDivElement | null>(null);
  const closingRef = useRef(false);
  const hasOpenedRef = useRef(false);
  const previousLinkIdRef = useRef(link.id);
  const keyboardNavigationRef = useRef(false);
  const originRectRef = useRef<Rect | null>(
    originRect ? toRect(originRect) : null,
  );
  const [flyVisible, setFlyVisible] = useState(Boolean(originRect));
  const host = linkHostname(link.url);

  useEffect(() => {
    if (originRect) originRectRef.current = toRect(originRect);
  }, [originRect]);

  const previewSrc = requiresLoginPlaceholder(link.url)
    ? "/placeholder-unicorn.jpg"
    : (getFeedImageUrl(link.imageUrl, 960) ??
      getProxiedImageUrl(link.imageUrl));
  const invertClass =
    !requiresLoginPlaceholder(link.url) && brandThumbnailInvertInDark(link.url)
      ? "invert"
      : "";
  const faviconSrc = !isJunkFavicon(link.faviconUrl)
    ? getProxiedImageUrl(link.faviconUrl)
    : undefined;

  const showSettled = useCallback(() => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    const stage = stageRef.current;
    const chrome = chromeRef.current;
    const fly = flyRef.current;
    if (backdrop) gsap.set(backdrop, { opacity: 1 });
    if (panel) gsap.set(panel, { opacity: 1, y: 0, filter: "blur(0px)" });
    if (stage) gsap.set(stage, { opacity: 1 });
    if (chrome) gsap.set(chrome, { opacity: 1 });
    if (fly) {
      gsap.set(fly, {
        opacity: 0,
        visibility: "hidden",
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        clearProps: "left,top,width,height",
      });
    }
    setFlyVisible(false);
  }, []);

  const animateClose = useCallback(
    (keyboardInitiated = false) => {
      if (closingRef.current) return;
      closingRef.current = true;
      if (keyboardInitiated || prefersReducedMotion()) {
        onClose();
        return;
      }

      const backdrop = backdropRef.current;
      const panel = panelRef.current;
      const stage = stageRef.current;
      const chrome = chromeRef.current;
      const fly = flyRef.current;
      const origin = originRectRef.current;
      if (!backdrop || !panel || !stage) {
        onClose();
        return;
      }

      const stageBox = toRect(stage.getBoundingClientRect());
      const morph = morphDuration(0.42);
      const tl = gsap.timeline({
        defaults: { ease: MORPH_EASE },
        onComplete: () => onClose(),
      });

      tl.to(
        panel,
        {
          y: 10,
          opacity: 0,
          filter: "blur(6px)",
          duration: morphDuration(0.18),
        },
        0,
      );
      if (chrome) {
        tl.to(chrome, { opacity: 0, duration: morphDuration(0.16) }, 0);
      }

      if (fly && origin) {
        setFlyVisible(true);
        gsap.set(fly, {
          ...flyInvertProps(stageBox, stageBox),
          opacity: 1,
          visibility: "visible",
          pointerEvents: "none",
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
        });
        gsap.set(stage, { opacity: 0 });

        const invert = flyInvertProps(origin, stageBox);
        tl.to(
          fly,
          {
            x: invert.x,
            y: invert.y,
            scaleX: invert.scaleX,
            scaleY: invert.scaleY,
            duration: morph,
            ease: MORPH_EASE,
            force3D: true,
          },
          morphDuration(0.04),
        )
          .to(fly, { opacity: 0, duration: morphDuration(0.1) }, morph * 0.82)
          .to(
            backdrop,
            { opacity: 0, duration: morphDuration(0.28) },
            morphDuration(0.06),
          );
      } else {
        tl.to(
          stage,
          { opacity: 0, scale: 0.97, duration: morphDuration(0.22) },
          0,
        ).to(
          backdrop,
          { opacity: 0, duration: morphDuration(0.24) },
          morphDuration(0.04),
        );
      }
    },
    [onClose],
  );

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
    const chrome = chromeRef.current;
    if (!backdrop || !panel || !stage) return;

    const reduceMotion = prefersReducedMotion();
    const isFirstOpen = !hasOpenedRef.current;
    const linkChanged = previousLinkIdRef.current !== link.id;

    if (!isFirstOpen && !linkChanged) {
      showSettled();
      return;
    }

    previousLinkIdRef.current = link.id;

    if (!isFirstOpen && linkChanged) {
      if (keyboardNavigationRef.current) {
        keyboardNavigationRef.current = false;
        gsap.set(stage, { opacity: 1 });
        return;
      }
      const tween = gsap.fromTo(
        stage,
        { opacity: reduceMotion ? 0.7 : 0.6 },
        {
          opacity: 1,
          duration: reduceMotion ? 0.1 : 0.18,
          ease: "power3.out",
        },
      );
      return () => {
        tween.kill();
        gsap.set(stage, { opacity: 1 });
      };
    }

    hasOpenedRef.current = true;
    const origin = originRectRef.current;
    const tl = gsap.timeline({ defaults: { ease: MORPH_EASE } });

    gsap.set(backdrop, { opacity: 0 });
    gsap.set(chrome, { opacity: 0 });
    gsap.set(
      panel,
      reduceMotion
        ? { opacity: 0, y: 0, filter: "blur(0px)" }
        : { opacity: 0, y: 14, filter: "blur(8px)" },
    );

    if (reduceMotion || !origin) {
      gsap.set(stage, { opacity: 0 });
      setFlyVisible(false);
      tl.to(backdrop, { opacity: 1, duration: morphDuration(0.2) }, 0)
        .to(stage, { opacity: 1, duration: morphDuration(0.2) }, morphDuration(0.02))
        .to(chrome, { opacity: 1, duration: morphDuration(0.18) }, morphDuration(0.04))
        .to(
          panel,
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: morphDuration(0.22),
          },
          morphDuration(0.06),
        );
      return () => {
        tl.kill();
        showSettled();
      };
    }

    // Shared-element open: single FLIP scale morph (GPU), ease-in-out @ 1.25×.
    setFlyVisible(true);
    gsap.set(stage, { opacity: 0 });

    const runOpen = () => {
      const fly = flyRef.current;
      if (!fly) {
        showSettled();
        return;
      }
      const dest = toRect(stage.getBoundingClientRect());
      const morph = morphDuration(0.48);

      gsap.set(fly, {
        ...flyInvertProps(origin, dest),
        opacity: 1,
        visibility: "visible",
        pointerEvents: "none",
        force3D: true,
      });

      tl.to(backdrop, { opacity: 1, duration: morphDuration(0.36) }, 0)
        .to(
          fly,
          {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            duration: morph,
            ease: MORPH_EASE,
            force3D: true,
          },
          0,
        )
        .to(chrome, { opacity: 1, duration: morphDuration(0.18) }, morph * 0.55)
        .add(() => {
          gsap.set(stage, { opacity: 1 });
        }, morph * 0.88)
        .to(fly, { opacity: 0, duration: morphDuration(0.1) }, morph * 0.88)
        .to(
          panel,
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: morphDuration(0.28),
          },
          morph * 0.62,
        )
        .add(() => {
          if (flyRef.current) {
            gsap.set(flyRef.current, {
              visibility: "hidden",
              x: 0,
              y: 0,
              scaleX: 1,
              scaleY: 1,
            });
          }
          setFlyVisible(false);
        }, morph + morphDuration(0.04));
    };

    // Wait one frame so stage has laid out at final size.
    const raf = requestAnimationFrame(runOpen);

    return () => {
      cancelAnimationFrame(raf);
      tl.kill();
      showSettled();
    };
  }, [link.id, originRect, showSettled]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      className="mind-overlay fixed inset-0 z-[200] flex"
      role="dialog"
      aria-modal="true"
      aria-label={link.displayTitle}
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={() => animateClose()}
      />

      {/* Intermediate shared-element layer (card → detail) */}
      <div
        ref={flyRef}
        className="mind-overlay-fly pointer-events-none fixed z-[220] will-change-transform overflow-hidden rounded-[4px] bg-surface-elevated shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        aria-hidden={!flyVisible}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt=""
          referrerPolicy="no-referrer"
          decoding="async"
          className={`block size-full object-cover object-top ${invertClass}`}
          draggable={false}
        />
      </div>

      <div
        className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
        onClick={() => animateClose()}
      >
        <div
          ref={chromeRef}
          className="sticky top-0 z-20 flex items-center gap-1 px-4 pt-4 pb-2 md:px-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => animateClose()}
            className="flex size-8 items-center justify-center rounded-[4px] border border-white/10 bg-white/10 text-subtle backdrop-blur-md transition hover:bg-white/15 hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
          <button
            type="button"
            disabled={!hasPrev}
            onClick={onPrev}
            className="flex size-8 items-center justify-center rounded-[4px] border border-white/10 bg-white/10 text-subtle backdrop-blur-md transition hover:bg-white/15 disabled:opacity-30"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={onNext}
            className="flex size-8 items-center justify-center rounded-[4px] border border-white/10 bg-white/10 text-subtle backdrop-blur-md transition hover:bg-white/15 disabled:opacity-30"
            aria-label="Next"
          >
            ›
          </button>
        </div>

        <div
          className="relative z-10 flex min-w-0 flex-1 flex-col items-center px-6 pb-10 md:px-10"
          onClick={(e) => {
            if (e.target === e.currentTarget) animateClose();
          }}
        >
          <div
            ref={stageRef}
            className="mind-overlay-stage group relative w-full max-w-[min(90vw,920px)] overflow-hidden rounded-[4px] bg-surface-elevated shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt={link.displayTitle}
              referrerPolicy="no-referrer"
              decoding="async"
              className={`mx-auto block max-h-[min(62vh,720px)] w-auto max-w-full object-contain ${invertClass}`}
            />
            <MindCardActions url={link.url} host={host} />
          </div>

          <div
            ref={panelRef}
            className="mind-overlay-glass mt-6 w-full max-w-[min(90vw,920px)] rounded-[4px] p-5 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
              <div className="min-w-0 flex-1">
                <h2 className="font-departure text-[22px] leading-tight font-semibold tracking-wide text-foreground uppercase">
                  {link.displayTitle}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <div className="flex items-center gap-2">
                    {faviconSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={faviconSrc}
                        alt=""
                        width={18}
                        height={18}
                        className="size-[18px] rounded-[3px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <span className="text-sm font-medium text-muted">{host}</span>
                  </div>
                  {groupName ? (
                    <span className="text-[12px] text-subtle">
                      in {groupName}
                    </span>
                  ) : null}
                  <span className="text-[12px] text-subtle">
                    Saved {formatRelativeTime(link.createdAt)}
                  </span>
                </div>

                {link.description ? (
                  <p className="mt-4 text-[15px] leading-relaxed text-muted">
                    {link.description}
                  </p>
                ) : null}

                {link.tags.length ? (
                  <dl className="mt-5 space-y-0 border-t border-white/10">
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 py-3">
                      <dt className="shrink-0 text-[12px] text-subtle">Tags</dt>
                      <dd className="flex flex-wrap justify-end gap-1">
                        {link.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-[4px] bg-white/10 px-2 py-0.5 text-[11px] text-muted"
                          >
                            {t}
                          </span>
                        ))}
                      </dd>
                    </div>
                  </dl>
                ) : null}
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2 md:w-[200px]">
                <label className="flex flex-col gap-1 text-[11px] font-medium text-subtle">
                  Move to group
                  <select
                    value={link.groupId}
                    onChange={(e) => onMove(link, e.target.value)}
                    className="rounded-[4px] border border-white/12 bg-black/25 px-2 py-2 text-sm text-foreground backdrop-blur-sm"
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
                  className="rounded-[4px] border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
