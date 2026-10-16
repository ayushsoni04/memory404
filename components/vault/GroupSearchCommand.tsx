"use client";

import { useEffect, useRef, useState } from "react";
import { Command, CommandGroup, CommandItem, CommandList } from "cmdk";
import { X } from "lucide-react";
import type { GroupRow } from "./types";

type Props = {
  value: string;
  onChange: (val: string) => void;
  /** Already-filtered candidates to jump to, in display order. */
  groups: GroupRow[];
  onSelectGroup: (id: string) => void;
  placeholder?: string;
  className?: string;
  dropdownAlign?: "start" | "end";
};

export default function GroupSearchCommand({
  value,
  onChange,
  groups,
  onSelectGroup,
  placeholder = "Search",
  className,
  dropdownAlign = "end",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const query = value.trim();
  const showDropdown = open && query.length > 0;

  return (
    <Command
      ref={rootRef}
      label={placeholder}
      shouldFilter={false}
      className={`relative ${className || ""}`}
    >
      <div className="relative flex items-center">
        <Command.Input
          value={value}
          onValueChange={onChange}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          className="h-7 w-full rounded-full border border-border bg-surface ps-3 pe-6 text-[13px] text-foreground outline-none transition-[border-color,box-shadow] duration-[var(--duration-ui)] placeholder:text-subtle focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_35%,transparent)]"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            aria-label="Clear search"
            className="absolute right-1.5 flex size-4 items-center justify-center rounded-full bg-pill text-muted transition-[transform,background-color,color] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-pill-hover hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--focus)_40%,transparent)]"
          >
            <X className="size-2.5" strokeWidth={3} />
          </button>
        ) : null}
      </div>
      {showDropdown ? (
        <CommandList
          className={`absolute top-[calc(100%+6px)] z-30 max-h-56 w-full min-w-48 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-1 shadow-lg ${
            dropdownAlign === "start" ? "left-0" : "right-0"
          }`}
        >
          {groups.length > 0 ? (
            <CommandGroup
              heading="Jump to group"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-subtle"
            >
              {groups.map((g) => (
                <CommandItem
                  key={g.id}
                  value={g.id}
                  onSelect={() => {
                    onSelectGroup(g.id);
                    onChange("");
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-lg px-2 py-1.5 text-[13px] text-foreground transition-[background-color] duration-[var(--duration-press)] data-[selected=true]:bg-pill-hover"
                >
                  {g.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <div className="space-y-1 px-2.5 py-2">
              <p className="text-[12px] text-subtle">No groups match “{query}”</p>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-[12px] text-foreground underline-offset-2 hover:underline"
              >
                Clear search
              </button>
            </div>
          )}
        </CommandList>
      ) : null}
    </Command>
  );
}
