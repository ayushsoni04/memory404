"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GENERAL_GROUP_NAME } from "@/lib/group-constants";
import { useDialogContainment } from "@/lib/dialog-focus";
import { controlPress } from "./types";

export type GroupTrashTarget = {
  id: string;
  name: string;
  linksCount: number;
};

/** The catch-all group cannot be trashed. Unknown ids are ignored. */
export function groupTrashTarget(
  groups: GroupTrashTarget[],
  groupId: string,
): GroupTrashTarget | null {
  const group = groups.find((item) => item.id === groupId);
  if (!group) return null;
  if (group.name.trim().toLowerCase() === GENERAL_GROUP_NAME.toLowerCase()) {
    return null;
  }
  return group;
}

export function groupTrashDetail(linksCount: number): string {
  if (linksCount <= 0) {
    return "This group is empty. You can restore it from Trash for 30 days.";
  }
  const links =
    linksCount === 1 ? "1 link moves with it" : `${linksCount} links move with it`;
  return `${links}. You can restore the group from Trash for 30 days.`;
}

export function groupTrashFailureMessage(data: unknown, offline = false): string {
  if (!offline && data && typeof data === "object") {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error.trim();
  }
  if (offline) {
    return "Couldn't move that group to Trash. Check your connection and try again.";
  }
  return "Couldn't move that group to Trash.";
}

type Props = {
  name: string;
  linksCount: number;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function GroupTrashConfirm({
  name,
  linksCount,
  pending = false,
  error = null,
  onConfirm,
  onCancel,
}: Props) {
  const portalRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmLock = useRef(false);
  useDialogContainment(true, portalRef, dialogRef, cancelRef);

  useEffect(() => {
    if (!pending) confirmLock.current = false;
  }, [pending]);

  const confirm = () => {
    if (confirmLock.current || pending) return;
    confirmLock.current = true;
    onConfirm();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || pending) return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  const dialog = (
    <div
      ref={portalRef}
      className="fixed inset-0 z-[260] flex items-end justify-center p-4 sm:items-center"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!pending) onCancel();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-busy={pending}
        aria-labelledby="group-trash-title"
        className="relative w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <h2 id="group-trash-title" className="break-words text-sm font-medium text-foreground">
          Move {name} to Trash?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {groupTrashDetail(linksCount)}
        </p>
        {error ? (
          <p className="mt-3 text-[13px] text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={`inline-flex h-8 items-center rounded-full bg-pill px-3 text-[13px] font-medium text-foreground disabled:opacity-50 ${controlPress}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className={`inline-flex h-8 items-center rounded-full border border-danger/30 bg-danger/10 px-3 text-[13px] font-medium text-danger hover:bg-danger/20 disabled:opacity-50 ${controlPress}`}
          >
            {pending ? "Moving…" : "Move to Trash"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}
