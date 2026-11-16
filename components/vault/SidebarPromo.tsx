"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Download, FlaskConical, Trash2 } from "lucide-react";
import { EXTENSION_VERSION, EXTENSION_ZIP_FILENAME, EXTENSION_ZIP_HREF } from "@/lib/extension-download";

type Slide = {
  id: string;
  icon: ReactNode;
  title: string;
  kicker: string;
  body: string;
  cta: string;
  href: string;
  download?: string;
};

const ROTATE_MS = 7000;

/** Rotating card at the foot of the sidebar, paged with dots. */
export function SidebarPromo({ isOwner = false }: { isOwner?: boolean }) {
  const slides: Slide[] = [
    {
      id: "extension",
      icon: <Download className="size-3.5" strokeWidth={1.8} />,
      title: "Save from any tab",
      kicker: `Extension ${EXTENSION_VERSION}`,
      body: "Keep the page you are on in one click, straight into a group.",
      cta: "Download",
      href: EXTENSION_ZIP_HREF,
      download: EXTENSION_ZIP_FILENAME,
    },
    {
      id: "trash",
      icon: <Trash2 className="size-3.5" strokeWidth={1.8} />,
      title: "Nothing is lost",
      kicker: "Trash",
      body: "Removed links stay in Trash for 30 days, ready to restore.",
      cta: "Open Trash",
      href: "/trash",
    },
    ...(isOwner
      ? [
          {
            id: "workspace",
            icon: <FlaskConical className="size-3.5" strokeWidth={1.8} />,
            title: "Workspace",
            kicker: "Labs",
            body: "Try motion and layout experiments before they ship.",
            cta: "Open Workspace",
            href: "/workspace",
          },
        ]
      : []),
  ];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  const slide = slides[index % slides.length];
  const linkProps = slide.download
    ? { href: slide.href, download: slide.download }
    : { href: slide.href };

  return (
    <section
      className="sidebar-promo"
      aria-roledescription="carousel"
      aria-label="Tips"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div key={slide.id} className="sidebar-promo-card" aria-live="polite">
        <div className="flex items-center gap-2.5">
          <span className="sidebar-promo-icon" aria-hidden>
            {slide.icon}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-medium text-foreground">{slide.title}</span>
            <span className="text-[11px] text-subtle">{slide.kicker}</span>
          </span>
        </div>
        <p className="mt-3 text-[12px] leading-[1.55] text-muted">{slide.body}</p>
        {slide.download ? (
          <a {...linkProps} className="sidebar-promo-cta">
            {slide.cta}
            <ChevronRight className="size-3.5" aria-hidden />
          </a>
        ) : (
          <Link href={slide.href} className="sidebar-promo-cta">
            {slide.cta}
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {slides.length > 1 ? (
        <div className="mt-2.5 flex justify-center gap-1" role="group" aria-label="Choose tip">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show ${s.title}`}
              aria-current={i === index % slides.length}
              onClick={() => setIndex(i)}
              className="sidebar-promo-dot"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
