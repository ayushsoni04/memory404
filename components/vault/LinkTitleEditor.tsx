"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import { explainLoadError } from "@/lib/load-error";
import { linkTitleIssue } from "@/lib/link-title";
import type { LinkApiRow } from "@/lib/links";

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black";

type Props = {
  link: LinkApiRow;
  onSaved?: (link: LinkApiRow) => void;
};

export default function LinkTitleEditor({ link, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(link.displayTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const renameRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef(false);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (editing || !returnFocusRef.current) return;
    returnFocusRef.current = false;
    renameRef.current?.focus();
  }, [editing]);

  const closeEditor = () => {
    returnFocusRef.current = true;
    setEditing(false);
  };

  const cancel = () => {
    setDraft(link.displayTitle);
    setError(null);
    closeEditor();
  };

  const save = async () => {
    const issue = linkTitleIssue(draft);
    if (issue) {
      setError(issue);
      inputRef.current?.focus();
      return;
    }
    const next = draft.trim();
    const unchanged = next ? next === link.displayTitle : link.customTitle == null;
    if (unchanged) {
      setError(null);
      closeEditor();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/links/${link.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTitle: next || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data || typeof data !== "object" || !("link" in data) || !data.link) {
        const serverMessage =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "";
        setError(explainLoadError(serverMessage) ?? "Could not rename the link.");
        inputRef.current?.focus();
        return;
      }
      onSaved?.(data.link as LinkApiRow);
      closeEditor();
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : "";
      setError(explainLoadError(raw) ?? "Could not rename the link. Try again.");
      inputRef.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <h2
          id="link-detail-title"
          title={link.displayTitle}
          className="min-w-0 break-words font-departure text-[22px] leading-tight font-semibold tracking-wide text-foreground uppercase"
        >
          {link.displayTitle}
        </h2>
        <button
          ref={renameRef}
          type="button"
          onClick={() => {
            setDraft(link.displayTitle);
            setError(null);
            setEditing(true);
          }}
          className={`mt-1 shrink-0 text-[12px] text-subtle underline-offset-2 hover:text-foreground hover:underline ${focusRing}`}
        >
          Rename
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h2 id="link-detail-title" className="sr-only">
        {link.displayTitle}
      </h2>
      <label htmlFor={`link-title-${link.id}`} className="text-[12px] text-subtle">
        Name
      </label>
      <input
        ref={inputRef}
        id={`link-title-${link.id}`}
        value={draft}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `link-title-error-${link.id}` : `link-title-hint-${link.id}`}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          setError(linkTitleIssue(next));
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          cancel();
        }}
        className={`mt-1 w-full rounded-[4px] border border-white/12 bg-black/25 px-3 py-2 text-sm text-foreground ${focusRing}`}
      />
      <p id={`link-title-hint-${link.id}`} className="mt-1 text-[12px] text-subtle">
        Leave this blank to use the page title.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || Boolean(linkTitleIssue(draft))}
          className={`inline-flex h-8 items-center rounded-full bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg hover:opacity-90 disabled:opacity-50 ${focusRing}`}
        >
          {saving ? "Saving…" : "Save name"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className={`inline-flex h-8 items-center rounded-full px-3 text-[13px] text-subtle hover:text-foreground disabled:opacity-50 ${focusRing}`}
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p id={`link-title-error-${link.id}`} className="mt-2 text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
