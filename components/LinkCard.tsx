"use client";

import { memo, useRef, useState } from "react";
import { AppLoader } from "@/components/AppLoader";
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
  const host = linkHostname(link.url);
  const pending = link.metadataStatus === "pending" || !!link.isPending;
  const loginGated = requiresLoginPlaceholder(link.url);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
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

  return (
    <article
      ref={cardRef}
      className={`mind-card${entering ? " mind-card-enter" : ""}`}
      draggable
      onDragStart={(e) => {
        // Avoid treating a normal click as a drag (which suppresses click).
        e.dataTransfer.setData("linkId", link.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        // Ignore clicks that originated from the external-link control.
        if ((e.target as HTMLElement).closest("a[href]")) return;
        if (cardRef.current) onOpen(link, cardRef.current);
      }}
    >
      <div className="mind-card-shell group relative rounded-[4px] bg-surface-elevated">
        <span className="mind-card-stroke" aria-hidden />
        <button
          type="button"
          aria-label={`Open details for ${link.displayTitle}`}
          className="relative z-[1] block w-full overflow-hidden rounded-[4px] text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          onClick={(e) => {
            e.stopPropagation();
            if (cardRef.current) onOpen(link, cardRef.current);
          }}
        >
          <span className="mind-card-preview relative block w-full overflow-hidden bg-surface">
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
                if (loginGated || fallbackUrl) return;
                setFallbackUrl(googleFaviconUrl(link.url) ?? "");
                setLoaded(false);
              }}
            />
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
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              title={`Open ${host}`}
              aria-label={`Open original link: ${host}`}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-3 bottom-3 z-10 box-border flex size-[28px] min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-full bg-[rgba(90,90,90,0.4)] text-white leading-none opacity-100 shadow-[0_-1px_0_rgba(255,255,255,0.35),1px_0_0_rgba(255,255,255,0.15),-1px_0_0_rgba(255,255,255,0.15),0_1px_0_rgba(255,255,255,0.3),0_1px_1px_rgba(0,0,0,0.2)] backdrop-saturate-150"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4.5 11.5L11.5 4.5M11.5 4.5H6.5M11.5 4.5V9.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            {showLoader ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <AppLoader compact progressive label="capturing" />
              </span>
            ) : null}
          </span>
        </button>
      </div>
      <p className="mind-card-title mt-2 px-0.5 text-[13px] leading-snug text-muted">
        {link.displayTitle}
      </p>
      {showLoader ? (
        <p className="mt-0.5 px-0.5 text-[11px] text-subtle">
          Capturing screenshot…
        </p>
      ) : null}
    </article>
  );
}

/**
 * Memoized so it only re-renders when the `link` prop reference changes.
 * This prevents 24+ re-renders on every VaultInbox state update (copiedId,
 * openedLinkId, gridSize, etc.) that have nothing to do with individual cards.
 */
export default memo(LinkCard);
