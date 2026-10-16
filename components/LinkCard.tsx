"use client";

import { memo, useRef, useState } from "react";
import { AppLoader } from "@/components/AppLoader";
import DitheredPreview from "@/components/vault/DitheredPreview";
import MindCardActions from "@/components/vault/MindCardActions";
import { nextCardPreview } from "@/components/vault/preview-fallback";
import {
  googleFaviconUrl,
  linkHostname,
  requiresLoginPlaceholder,
  type LinkApiRow,
} from "@/lib/links";
import { brandThumbnailInvertInDark } from "@/lib/link-providers";
import {
  getFeedImageSrcSet,
  getFeedImageUrl,
  getProxiedImageUrl,
} from "@/lib/screenshot";

type Props = {
  link: LinkApiRow;
  onOpen: (link: LinkApiRow, originEl: HTMLElement) => void;
  priority?: boolean;
  imageSizes?: string;
  entering?: boolean;
  /** When provided the card becomes draggable and fires this callback on dragStart. */
  onDragToTrash?: (linkId: string) => void;
};

function isJunkFavicon(url: string | null | undefined): boolean {
  if (!url) return true;
  return /dummyimage\.com|placehold\.|via\.placeholder/i.test(url);
}

function LinkCard({
  link,
  onOpen,
  priority = false,
  imageSizes = "50vw",
  entering = false,
}: Props) {
  const cardRef = useRef<HTMLElement | null>(null);
  const previewRef = useRef<HTMLSpanElement | null>(null);
  const host = linkHostname(link.url);
  const pending = link.metadataStatus === "pending" || !!link.isPending;
  const loginGated = requiresLoginPlaceholder(link.url);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Prefer placeholder for auth/LMS hosts even if a stale cache still has a
  // Cloudinary screenshot of a "please wait" interstitial.
  const resolvedImageUrl = loginGated
    ? "/placeholder-unicorn.jpg"
    : (fallbackUrl ?? link.imageUrl);
  const feedSrc = getFeedImageUrl(resolvedImageUrl);
  const feedSrcSet = loginGated ? undefined : getFeedImageSrcSet(resolvedImageUrl);
  const faviconSrc = !isJunkFavicon(link.faviconUrl)
    ? getProxiedImageUrl(link.faviconUrl)
    : getProxiedImageUrl(googleFaviconUrl(link.url, 64) ?? undefined);
  const invert =
    !loginGated && brandThumbnailInvertInDark(link.url) ? "invert" : "";

  const showLoader = pending;
  const showMark = !loginGated && (broken || !feedSrc);
  const markLetter = (host[0] ?? "•").toUpperCase();

  const openDetails = () => {
    const origin = previewRef.current ?? cardRef.current;
    if (origin) onOpen(link, origin);
  };

  return (
    <article
      ref={cardRef}
      className={`mind-card break-inside-avoid${entering ? " mind-card-enter" : ""}`}
      draggable
      onDragStart={(e) => {
        // Avoid treating a normal click as a drag (which suppresses click).
        e.dataTransfer.setData("linkId", link.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        // Ignore clicks from in-preview action controls.
        if ((e.target as HTMLElement).closest("[data-card-action]")) return;
        const origin = previewRef.current ?? cardRef.current;
        if (origin) onOpen(link, origin);
      }}
    >
      <div className="mind-card-shell group relative rounded-[4px] bg-surface-elevated transition-transform duration-[var(--duration-press)] ease-[var(--ease-out)] active:scale-[0.985]">
        <span className="mind-card-stroke" aria-hidden />
        <div
          role="button"
          tabIndex={0}
          id={`feed-card-${link.id}`}
          data-feed-card=""
          aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
          aria-label={`Open details for ${link.displayTitle}`}
          className="relative z-[1] block w-full cursor-pointer overflow-hidden rounded-[4px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={(e) => {
            e.stopPropagation();
            openDetails();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            e.stopPropagation();
            openDetails();
          }}
        >
          <span
            ref={previewRef}
            className="mind-card-preview relative block w-full overflow-hidden bg-surface"
          >
            {showMark ? (
              <span
                data-preview="missing"
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface px-4 text-center"
              >
                <span
                  aria-hidden
                  className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-elevated text-[15px] font-medium text-muted"
                >
                  {markLetter}
                </span>
                <span className="line-clamp-2 max-w-full text-[11px] leading-snug text-subtle">
                  {host}
                </span>
              </span>
            ) : (
              <DitheredPreview>
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary srcset + native lazy; no activation queue */}
                <img
                  key={`${link.id}-${resolvedImageUrl}`}
                  src={feedSrc}
                  srcSet={feedSrcSet}
                  sizes={feedSrcSet ? imageSizes : undefined}
                  alt={link.displayTitle}
                  loading={priority ? "eager" : "lazy"}
                  fetchPriority={priority ? "high" : "auto"}
                  referrerPolicy="no-referrer"
                  decoding="async"
                  draggable={false}
                  onLoad={() => setLoaded(true)}
                  className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-200 ${
                    loaded ? "opacity-100" : "opacity-0"
                  } ${invert} ${showLoader ? "opacity-60" : ""}`}
                  onError={() => {
                    if (loginGated) return;
                    const next = nextCardPreview(
                      resolvedImageUrl,
                      googleFaviconUrl(link.url),
                      fallbackUrl !== null,
                    );
                    if (next) {
                      setFallbackUrl(next);
                      setLoaded(false);
                      return;
                    }
                    setBroken(true);
                  }}
                />
              </DitheredPreview>
            )}
            <span className="mind-card-hover-scrim pointer-events-none absolute inset-0 bg-black/0 opacity-0" />
            {faviconSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- small badge; native lazy
              <img
                src={faviconSrc}
                alt=""
                width={28}
                height={28}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                className="pointer-events-none absolute bottom-3 left-3 z-[1] size-7 rounded-full object-cover shadow-[0_2px_6px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.08)]"
                referrerPolicy="no-referrer"
              />
            ) : null}
            {showLoader ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <AppLoader compact progressive label="capturing" />
              </span>
            ) : null}
          </span>
        </div>
        <MindCardActions url={link.url} host={host} />
      </div>
      <div className="mind-card-caption">
        <p className="mind-card-title mt-2 px-0.5 text-[13px] leading-snug text-muted">
          {link.displayTitle}
        </p>
        {link.notes ? (
          <p className="mt-0.5 line-clamp-2 px-0.5 text-[12px] leading-snug text-subtle">
            {link.notes}
          </p>
        ) : null}
        {showLoader ? (
          <p className="mt-0.5 px-0.5 text-[11px] text-subtle">
            Capturing screenshot…
          </p>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Memoized so it only re-renders when the `link` prop reference changes.
 * This prevents 24+ re-renders on every VaultInbox state update (copiedId,
 * openedLinkId, gridSize, etc.) that have nothing to do with individual cards.
 */
export default memo(LinkCard);
