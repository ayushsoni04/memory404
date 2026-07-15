"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { RisingHelixFill } from "@/components/RisingHelixFill";
import type { LinkApiRow } from "@/lib/links";

type Props = {
  groupId: string | null;
  onSaved: (link: LinkApiRow) => void;
  saveLink: (
    url: string,
    groupId: string,
  ) => Promise<{ ok: true; link: LinkApiRow } | { ok: false; error: string }>;
};

export default function AddLinkCard({
  groupId,
  onSaved,
  saveLink,
}: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const saveGen = useRef(0);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const cancel = () => {
    if (saving) return;
    setOpen(false);
    setUrl("");
    setError(null);
  };

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a URL");
      return;
    }
    if (!groupId) {
      setError("No group selected");
      return;
    }

    const gen = ++saveGen.current;
    setSaving(true);
    setShowSuccess(false);
    setError(null);

    // Close the form immediately — don't hold the UI on the network round-trip.
    const pendingUrl = trimmed;
    setUrl("");
    setOpen(false);

    try {
      const result = await saveLink(pendingUrl, groupId);
      if (gen !== saveGen.current) return;
      if (!result.ok) {
        setOpen(true);
        setUrl(pendingUrl);
        setError(result.error);
        setSaving(false);
        return;
      }
      
      // Success! Play the check animation
      setShowSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 1300));
      
      if (gen === saveGen.current) {
        onSaved(result.link);
        setShowSuccess(false);
        setSaving(false);
      }
    } catch {
      if (gen !== saveGen.current) return;
      setOpen(true);
      setUrl(pendingUrl);
      setError("Network error — try again");
      setSaving(false);
    }
  };

  return (
    <article className="mind-card mb-3 break-inside-avoid">
      <div className="mind-card-shell group relative min-h-[140px] overflow-hidden rounded-[4px]">
        <span className="mind-card-stroke" aria-hidden />
        <div className="relative z-[1] min-h-[140px] overflow-hidden rounded-[4px]">
        {saving ? <RisingHelixFill active /> : null}

        {!open && !saving ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!groupId}
            className="flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-[4px] border border-dashed border-muted/50 bg-transparent px-3 py-6 text-center outline-none transition-colors hover:border-foreground/35 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/40 disabled:opacity-40"
          >
            <Plus className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
            <span className="text-[13px] font-medium text-muted">Add link</span>
          </button>
        ) : null}

        {open && !saving ? (
          <form
            className="relative z-[2] flex min-h-[140px] flex-col justify-center gap-2 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
              placeholder="https://…"
              className="w-full rounded-[4px] border border-dashed border-border bg-surface px-2.5 py-2 text-[13px] text-foreground outline-none placeholder:text-subtle focus:border-foreground/40"
              autoComplete="off"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!url.trim() || !groupId}
                className="inline-flex h-7 items-center rounded-full bg-pill-active px-2.5 text-[13px] font-medium text-pill-active-fg disabled:opacity-45"
              >
                Save
              </button>
              <button
                type="button"
                onClick={cancel}
                className="inline-flex h-7 items-center rounded-full bg-pill px-2.5 text-[13px] text-muted hover:bg-pill-hover"
              >
                Cancel
              </button>
            </div>
            {error ? <p className="text-[11px] text-danger">{error}</p> : null}
          </form>
        ) : null}

        {saving ? (
          <div className="relative z-[2] flex min-h-[140px] flex-col items-center justify-center pt-2">
            {showSuccess ? (
              <div className="flex flex-col items-center gap-2">
                <span className="t-success-check" data-state="in" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-10">
                    <path d="M20 6L9 17L4 12" style={{ strokeDasharray: 24, strokeDashoffset: 24 }} />
                  </svg>
                </span>
                <span className="text-[12px] text-success font-medium">Link added!</span>
              </div>
            ) : (
              <span className="text-[12px] text-muted">Saving…</span>
            )}
          </div>
        ) : null}
        </div>
      </div>
    </article>
  );
}
