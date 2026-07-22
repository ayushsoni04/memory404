"use client";

import { useEffect, useRef, useState } from "react";
import { play } from "cuelume";
import { copyTextToClipboard } from "@/components/vault/link-utils";

const ACTION_BTN =
  "mind-card-action box-border flex shrink-0 items-center justify-center rounded-full text-white leading-none";

/** How long the "Copied" feedback stays visible before collapsing is allowed. */
const COPIED_HOLD_MS = 1400;

type Props = {
  url: string;
  host: string;
};

export default function MindCardActions({ url, host }: Props) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  return (
    <span className="mind-card-actions absolute right-3 bottom-3 z-10 flex flex-row items-center">
      <button
        type="button"
        data-card-action="copy"
        data-copied={copied ? "true" : undefined}
        data-hold={copied ? "true" : undefined}
        title={copied ? "Copied" : "Copy link"}
        aria-label={copied ? "Link copied" : `Copy link: ${host}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void (async () => {
            const ok = await copyTextToClipboard(url);
            if (!ok) return;
            play("ready");
            setCopied(true);
            if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
            copiedTimer.current = window.setTimeout(() => {
              setCopied(false);
              copiedTimer.current = null;
            }, COPIED_HOLD_MS);
          })();
        }}
        className={`mind-card-copy ${ACTION_BTN}`}
      >
        <span className="t-icon-swap" data-state={copied ? "b" : "a"}>
          <span className="t-icon" data-icon="a" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M5.5 5.5V3.75C5.5 3.06 6.06 2.5 6.75 2.5h5.5c.69 0 1.25.56 1.25 1.25v5.5c0 .69-.56 1.25-1.25 1.25H10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="2.5"
                y="5.5"
                width="8"
                height="8"
                rx="1.25"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </span>
          <span className="t-icon mind-card-copy-done" data-icon="b" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M3.5 8.5L6.5 11.5L12.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="mind-card-copy-label">Copied</span>
          </span>
        </span>
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        data-card-action="open"
        title={`Open ${host}`}
        aria-label={`Open original link: ${host}`}
        onClick={(e) => {
          e.stopPropagation();
          play("page");
        }}
        className={`mind-card-open relative z-[1] ${ACTION_BTN}`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4.5 11.5L11.5 4.5M11.5 4.5H6.5M11.5 4.5V9.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </span>
  );
}
