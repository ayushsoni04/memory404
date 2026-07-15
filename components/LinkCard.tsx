"use client";

import { useEffect, useRef, useState } from "react";
import { AppLoader } from "@/components/AppLoader";
import { isGoogleFaviconUrl, linkHostname, requiresLoginPlaceholder, type LinkApiRow } from "@/lib/links";
import { brandThumbnailInvertInDark } from "@/lib/link-providers";
import {
  getProxiedImageUrl,
  isThumIoUrl,
  resolveMicrolinkScreenshotUrl,
} from "@/lib/screenshot";

type Props = {
  link: LinkApiRow;
  onOpen: (link: LinkApiRow, originEl: HTMLElement) => void;
};

export default function LinkCard({ link, onOpen }: Props) {
  const cardRef = useRef<HTMLElement | null>(null);
  const host = linkHostname(link.url);
  const pending = link.metadata_status === "pending" || !!link.isPending;
  const [imgSrc, setImgSrc] = useState(link.image_url);
  const [resolving, setResolving] = useState(false);
  const resolveAttempted = useRef(false);

  useEffect(() => {
    setImgSrc(link.image_url);
    resolveAttempted.current = false;
  }, [link.id, link.image_url]);

  // Bad thum.io placeholders are stripped server-side to a favicon — fetch a real shot.
  // Also replace any lingering thum.io URL still in the client.
  useEffect(() => {
    if (pending || resolveAttempted.current || requiresLoginPlaceholder(link.url)) return;
    const needsShot =
      isThumIoUrl(imgSrc) || (!pending && isGoogleFaviconUrl(imgSrc));
    if (!needsShot) return;

    let cancelled = false;
    resolveAttempted.current = true;
    setResolving(true);

    void (async () => {
      const next = await resolveMicrolinkScreenshotUrl(link.url);
      if (cancelled) return;
      if (next) setImgSrc(next);
      setResolving(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [imgSrc, link.url, pending]);

  const showLoader = pending || resolving;

  return (
    <article ref={cardRef} className="mind-card mb-3 break-inside-avoid">
      <div className="mind-card-shell group relative rounded-[4px] bg-surface-elevated">
        <span className="mind-card-stroke" aria-hidden />
        <button
          type="button"
          className="relative z-[1] block w-full overflow-hidden rounded-[4px] text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          onClick={() => {
            if (cardRef.current) onOpen(link, cardRef.current);
          }}
        >
          <span className="relative block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${link.id}-${imgSrc}`}
              src={getProxiedImageUrl(imgSrc)}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              decoding="async"
              draggable={false}
              className={`mind-card-preview block w-full object-cover object-top ${
                !requiresLoginPlaceholder(link.url) && brandThumbnailInvertInDark(link.url) ? "invert" : ""
              } ${showLoader ? "opacity-60" : ""}`}
              onError={() => {
                if (resolveAttempted.current || requiresLoginPlaceholder(link.url)) return;
                resolveAttempted.current = true;
                setResolving(true);
                void resolveMicrolinkScreenshotUrl(link.url).then((next) => {
                  if (next) setImgSrc(next);
                  setResolving(false);
                });
              }}
            />
            <span className="pointer-events-none absolute inset-0 bg-black/0 opacity-0 transition duration-200 group-hover:bg-black/40 group-hover:opacity-100" />
            {link.favicon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={link.favicon_url}
                alt=""
                width={28}
                height={28}
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
        {link.display_title}
      </p>
      {showLoader ? (
        <p className="mt-0.5 px-0.5 text-[11px] text-subtle">
          Capturing screenshot…
        </p>
      ) : null}
    </article>
  );
}
