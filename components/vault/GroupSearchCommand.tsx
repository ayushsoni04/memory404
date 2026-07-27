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
};

export default function GroupSearchCommand({
  value,
  onChange,
  groups,
  onSelectGroup,
  placeholder = "Search",
  className,
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

  const showDropdown = open && value.trim().length > 0 && groups.length > 0;

  return (
    <Command
      ref={rootRef}
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
          className="h-7 w-full rounded-full border border-border bg-surface pl-3 pr-6 text-[13px] text-foreground outline-none focus:border-border-strong placeholder:text-subtle"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            aria-label="Clear search"
            className="absolute right-1.5 flex size-4 items-center justify-center rounded-full bg-pill text-muted hover:bg-pill-hover hover:text-foreground"
          >
            <X className="size-2.5" strokeWidth={3} />
          </button>
        ) : null}
      </div>
      {showDropdown ? (
        <CommandList className="absolute right-0 top-[calc(100%+6px)] z-30 max-h-56 w-48 overflow-y-auto rounded-lg border border-border bg-surface-elevated p-1 shadow-lg">
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
                className="cursor-pointer rounded-md px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-pill-hover"
              >
                {g.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      ) : null}
    </Command>
  );
}
