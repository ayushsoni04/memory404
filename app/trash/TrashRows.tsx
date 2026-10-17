"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import type { TrashGroupItem, TrashLinkItem } from "@/app/api/trash/route";
import { controlPress } from "@/components/vault/types";
import { linkHostname } from "@/lib/links";
import { libraryGroupLabel } from "@/lib/search-group";

function DaysLeft({ days }: { days: number }) {
  const color =
    days <= 3 ? "text-red-400" : days <= 7 ? "text-amber-400" : "text-muted";
  return (
    <span className={`text-[11px] tabular-nums ${color}`}>
      {days === 0 ? "Expires today" : `${days}d left`}
    </span>
  );
}

const rowClass =
  "trash-row group/card flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:border-border/80 sm:items-center";

const actionsClass =
  "trash-card-actions flex items-center gap-1.5 opacity-100 sm:opacity-0";

const restoreClass = `rounded-lg border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-background disabled:opacity-50 ${controlPress}`;

const deleteClass = `rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[12px] font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 ${controlPress}`;

function RowBody({
  title,
  detail,
  days,
  onRestore,
  onDelete,
  busy = false,
  media,
}: {
  title: string;
  detail: string;
  days: number;
  onRestore: () => void;
  onDelete: () => void;
  busy?: boolean;
  media: ReactNode;
}) {
  return (
    <>
      {media}
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-medium text-foreground">
            {title}
          </p>
          <p className="truncate text-[12px] text-muted">{detail}</p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <DaysLeft days={days} />
          <div className={actionsClass}>
            <button type="button" onClick={onRestore} disabled={busy} className={restoreClass}>
              Restore
            </button>
            <button type="button" onClick={onDelete} disabled={busy} className={deleteClass}>
              Delete Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function TrashGroupRow({
  item,
  exiting,
  busy = false,
  onRestore,
  onDelete,
}: {
  item: TrashGroupItem;
  exiting: boolean;
  busy?: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={rowClass} data-exiting={exiting}>
      <RowBody
        title={libraryGroupLabel(item.name) ?? item.name}
        detail={`${item.linksCount} ${item.linksCount === 1 ? "link" : "links"} inside`}
        days={item.daysLeft}
        onRestore={onRestore}
        onDelete={onDelete}
        busy={busy}
        media={
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
              <path d="M2 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" />
            </svg>
          </div>
        }
      />
    </div>
  );
}

export function TrashLinkRow({
  item,
  exiting,
  busy = false,
  onRestore,
  onDelete,
}: {
  item: TrashLinkItem;
  exiting: boolean;
  busy?: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const place = libraryGroupLabel(item.groupName);
  return (
    <div className={rowClass} data-exiting={exiting}>
      <RowBody
        title={item.displayTitle}
        detail={`${place ? `in ${place}` : "in deleted group"} · ${linkHostname(item.url)}`}
        days={item.daysLeft}
        onRestore={onRestore}
        onDelete={onDelete}
        busy={busy}
        media={
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
        }
      />
    </div>
  );
}
