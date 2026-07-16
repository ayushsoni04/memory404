"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { TrashApiItem, TrashLinkItem, TrashGroupItem } from "@/app/api/trash/route";

function apiUrl(path: string) {
  if (typeof window !== "undefined") return path;
  return `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}${path}`;
}

function DaysLeft({ days }: { days: number }) {
  const color =
    days <= 3 ? "text-red-400" : days <= 7 ? "text-amber-400" : "text-muted";
  return (
    <span className={`text-[11px] tabular-nums ${color}`}>
      {days === 0 ? "Expires today" : `${days}d left`}
    </span>
  );
}

function GroupCard({
  item,
  exiting,
  onRestore,
  onDelete,
}: {
  item: TrashGroupItem;
  exiting: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="trash-row group/card flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:border-border/80"
      data-exiting={exiting}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path d="M2 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
        <p className="text-[12px] text-muted">
          {item.linksCount} {item.linksCount === 1 ? "link" : "links"} inside
        </p>
      </div>
      <DaysLeft days={item.daysLeft} />
      <div className="trash-card-actions ml-2 flex items-center gap-1.5 opacity-0">
        <button
          onClick={onRestore}
          className="rounded-lg bg-surface border border-border px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-background transition-[transform,background-color] duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97]"
        >
          Restore
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[12px] font-medium text-red-400 hover:bg-red-500/20 transition-[transform,background-color] duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97]"
        >
          Delete Now
        </button>
      </div>
    </div>
  );
}

function LinkCard({
  item,
  exiting,
  onRestore,
  onDelete,
}: {
  item: TrashLinkItem;
  exiting: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="trash-row group/card flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:border-border/80"
      data-exiting={exiting}
    >
      <Image
        src={item.faviconUrl}
        alt=""
        width={32}
        height={32}
        unoptimized
        className="size-8 shrink-0 rounded-lg object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/placeholder-unicorn.jpg";
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.displayTitle}</p>
        <p className="truncate text-[12px] text-muted">
          {item.groupName ? `in ${item.groupName}` : "in deleted group"} ·{" "}
          {new URL(item.url).hostname.replace("www.", "")}
        </p>
      </div>
      <DaysLeft days={item.daysLeft} />
      <div className="trash-card-actions ml-2 flex items-center gap-1.5 opacity-0">
        <button
          onClick={onRestore}
          className="rounded-lg bg-surface border border-border px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-background transition-[transform,background-color] duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97]"
        >
          Restore
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[12px] font-medium text-red-400 hover:bg-red-500/20 transition-[transform,background-color] duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97]"
        >
          Delete Now
        </button>
      </div>
    </div>
  );
}

export default function TrashPage() {
  const [items, setItems] = useState<TrashApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());

  const loadTrash = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/trash"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setItems(data.items ?? []);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load trash");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const removeWithExit = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setExitingIds((prev) => new Set([...prev, ...ids]));
    await new Promise((resolve) => window.setTimeout(resolve, 160));
    const removed = new Set(ids);
    setItems((prev) => prev.filter((item) => !removed.has(item.id)));
    setExitingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const restoreLink = async (id: string) => {
    await fetch(apiUrl(`/api/trash/links/${id}`), { method: "PATCH" });
    await removeWithExit([id]);
  };

  const deleteLink = async (id: string) => {
    await fetch(apiUrl(`/api/trash/links/${id}`), { method: "DELETE" });
    await removeWithExit([id]);
  };

  const restoreGroup = async (id: string) => {
    await fetch(apiUrl(`/api/trash/groups/${id}`), { method: "PATCH" });
    await removeWithExit([id]);
  };

  const deleteGroup = async (id: string) => {
    await fetch(apiUrl(`/api/trash/groups/${id}`), { method: "DELETE" });
    // Also remove links that were in this group
    const removedIds = items
      .filter(
        (item) =>
          item.id === id || (item.type === "link" && item.groupId === id),
      )
      .map((item) => item.id);
    await removeWithExit(removedIds);
  };

  const emptyTrash = async () => {
    setEmptying(true);
    await fetch(apiUrl("/api/trash"), { method: "DELETE" });
    await removeWithExit(items.map((item) => item.id));
    setEmptying(false);
  };

  const groups = items.filter((i): i is TrashGroupItem => i.type === "group");
  const links = items.filter((i): i is TrashLinkItem => i.type === "link");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center justify-center size-8 rounded-lg hover:bg-surface transition-colors text-muted hover:text-foreground">
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight flex items-center gap-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-muted">
                  <path d="M8.5 4h3a1.5 1.5 0 0 0-3 0ZM7 4a2.5 2.5 0 0 1 5 0h4.25a.75.75 0 0 1 0 1.5h-.465l-.818 9.793A2.75 2.75 0 0 1 12.23 18H7.77a2.75 2.75 0 0 1-2.737-2.707L4.214 5.5H3.75a.75.75 0 0 1 0-1.5H7Z" />
                </svg>
                Trash
              </h1>
              <p className="text-[12px] text-muted">Items are permanently deleted after 30 days</p>
            </div>
          </div>
          {items.length > 0 && (
            <button
              onClick={emptyTrash}
              disabled={emptying}
              className="rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2 text-[13px] font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {emptying ? "Emptying…" : "Empty Trash"}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {loading && (
          <div className="flex items-center justify-center py-20 text-muted text-sm">
            Loading trash…
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <svg viewBox="0 0 48 48" fill="none" className="size-12 text-border">
              <path d="M20 10h8a4 4 0 0 0-8 0ZM16 10a8 8 0 0 1 16 0h10a2 2 0 0 1 0 4h-1.3l-2.2 26.1A7 7 0 0 1 31.7 46H16.3a7 7 0 0 1-6.8-5.9L7.3 14H6a2 2 0 0 1 0-4h10Z" fill="currentColor" />
            </svg>
            <p className="text-muted text-sm">Trash is empty</p>
          </div>
        )}

        {/* Groups section */}
        {groups.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[12px] font-medium uppercase tracking-wider text-muted px-1">
              Groups — {groups.length}
            </h2>
            <div className="space-y-1.5">
              {groups.map((g) => (
                <GroupCard
                  key={g.id}
                  item={g}
                  exiting={exitingIds.has(g.id)}
                  onRestore={() => void restoreGroup(g.id)}
                  onDelete={() => void deleteGroup(g.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Links section */}
        {links.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[12px] font-medium uppercase tracking-wider text-muted px-1">
              Links — {links.length}
            </h2>
            <div className="space-y-1.5">
              {links.map((l) => (
                <LinkCard
                  key={l.id}
                  item={l}
                  exiting={exitingIds.has(l.id)}
                  onRestore={() => void restoreLink(l.id)}
                  onDelete={() => void deleteLink(l.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
