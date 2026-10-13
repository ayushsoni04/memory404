"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Puzzle } from "lucide-react";

const EXTENSION_ZIP_HREF = "/downloads/memory404-extension.zip";

type ExtensionInstallCardProps = {
  /** Compact layout for empty vault; full for settings. */
  variant?: "settings" | "empty";
};

export function ExtensionInstallCard({
  variant = "settings",
}: ExtensionInstallCardProps) {
  const [appUrl, setAppUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setAppUrl(window.location.origin), 0);
    return () => window.clearTimeout(id);
  }, []);

  const copyAppUrl = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  if (variant === "empty") {
    return (
      <div className="mt-8 w-full max-w-[28rem] space-y-3 border-t border-border/50 pt-6 text-center">
        <p className="text-[13px] text-muted">
          Prefer one-click saves from any tab?
        </p>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <a
            href={EXTENSION_ZIP_HREF}
            download="memory404-extension.zip"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg transition-[transform,opacity] duration-[160ms] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97]"
          >
            <Download className="size-3.5" aria-hidden />
            Download extension
          </a>
          <a
            href="/settings#extension"
            className="inline-flex h-8 items-center justify-center px-2 text-[13px] text-subtle underline-offset-2 hover:text-foreground hover:underline"
          >
            Install on your own server
          </a>
        </div>
      </div>
    );
  }

  return (
    <section id="extension" className="scroll-mt-8 space-y-3 border-t border-border pt-6">
      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-mono tracking-wider text-subtle uppercase">
          <Puzzle className="size-3.5" aria-hidden />
          Chrome extension
        </h3>
        <p className="mt-0.5 text-xs text-subtle">
          Download the extension, load it in Chrome, and point App URL at this
          site — or any memory404 server you host yourself.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">
              Download package
            </p>
            <p className="font-mono text-[10px] text-subtle">
              Unzip, then Load unpacked in chrome://extensions
            </p>
          </div>
          <a
            href={EXTENSION_ZIP_HREF}
            download="memory404-extension.zip"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted transition-colors hover:bg-pill hover:text-foreground"
          >
            <Download className="size-3.5" aria-hidden />
            Download .zip
          </a>
        </div>

        <ol className="list-decimal space-y-1.5 ps-4 text-[11px] leading-relaxed text-subtle">
          <li>Unzip the download so you see a folder with manifest.json.</li>
          <li>
            Open <span className="font-mono text-muted">chrome://extensions</span>,
            enable Developer mode, then Load unpacked and select that folder.
          </li>
          <li>
            In the extension settings, set App URL to this instance or your own
            deployment.
          </li>
        </ol>

        <div className="space-y-1.5 border-t border-border/60 pt-3">
          <p className="text-[11px] font-medium text-muted">App URL for this site</p>
          <div className="flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface-elevated px-3 py-2 font-mono text-[11px] text-foreground">
              {appUrl || "…"}
            </code>
            <button
              type="button"
              onClick={() => void copyAppUrl()}
              disabled={!appUrl}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted transition-colors hover:bg-pill hover:text-foreground disabled:opacity-50"
              aria-label={copied ? "Copied" : "Copy App URL"}
            >
              {copied ? (
                <Check className="size-3.5 text-success" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-[10px] text-subtle">
            Self-hosting? Deploy memory404 (Vercel + API + MongoDB), then paste
            that origin as App URL instead.
          </p>
        </div>
      </div>
    </section>
  );
}
