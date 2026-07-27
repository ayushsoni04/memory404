"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "cmdk";
import { Folder, LayoutGrid, Settings, Trash2 } from "lucide-react";
import { apiUrl } from "@/lib/api-base";
import { linkHostname, type LinkApiRow } from "@/lib/links";

type PaletteGroup = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: PaletteGroup[];
  onSelectGroup: (id: string) => void;
};

export default function CommandPalette({
  open,
  onOpenChange,
  groups,
  onSelectGroup,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [linkResults, setLinkResults] = useState<LinkApiRow[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const requestIdRef = useRef(0);

  const closePalette = useCallback(() => {
    onOpenChange(false);
    setSearch("");
    requestIdRef.current++;
    setLinkResults([]);
    setLoadingLinks(false);
  }, [onOpenChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (open) {
          closePalette();
        } else {
          onOpenChange(true);
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange, closePalette]);

  const handleDialogOpenChange = useCallback(
    (next: boolean) => {
      if (next) onOpenChange(true);
      else closePalette();
    },
    [onOpenChange, closePalette],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const query = value.trim();
    if (!query) {
      requestIdRef.current++;
      setLinkResults([]);
      setLoadingLinks(false);
    } else {
      setLoadingLinks(true);
    }
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (!query) return;
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(() => {
      void fetch(apiUrl(`/api/links?search=${encodeURIComponent(query)}&limit=8`))
        .then((res) => res.json().catch(() => ({})))
        .then((data) => {
          if (requestId !== requestIdRef.current) return;
          setLinkResults(Array.isArray(data.links) ? data.links : []);
        })
        .catch(() => {
          if (requestId === requestIdRef.current) setLinkResults([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoadingLinks(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups.slice(0, 6);
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  const openLink = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleDialogOpenChange}
      label="Command palette"
      shouldFilter={false}
      contentClassName="fixed left-1/2 top-[18%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-2xl"
      overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
    >
      <CommandInput
        value={search}
        onValueChange={handleSearchChange}
        placeholder="Search links, jump to a group, or go to a page…"
        className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-subtle"
      />
      <CommandList className="max-h-80 overflow-y-auto p-2">
        {loadingLinks ? (
          <CommandLoading className="px-2 py-1.5 text-[12px] text-subtle">
            Searching links…
          </CommandLoading>
        ) : null}

        {filteredGroups.length ? (
          <CommandGroup
            heading="Groups"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-subtle"
          >
            {filteredGroups.map((g) => (
              <CommandItem
                key={g.id}
                value={`group-${g.id}`}
                onSelect={() => {
                  onSelectGroup(g.id);
                  closePalette();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-pill-hover"
              >
                <Folder className="size-3.5 text-muted" strokeWidth={2} />
                {g.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {linkResults.length ? (
          <CommandGroup
            heading="Links"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-subtle"
          >
            {linkResults.map((link) => (
              <CommandItem
                key={link.id}
                value={`link-${link.id}`}
                onSelect={() => {
                  openLink(link.url);
                  closePalette();
                }}
                className="flex cursor-pointer flex-col gap-0.5 rounded-md px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-pill-hover"
              >
                <span className="truncate">{link.displayTitle || link.title}</span>
                <span className="truncate text-[11px] text-subtle">
                  {linkHostname(link.url)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        <CommandGroup
          heading="Go to"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-subtle"
        >
          <CommandItem
            value="page-workspace"
            onSelect={() => {
              router.push("/workspace");
              closePalette();
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-pill-hover"
          >
            <LayoutGrid className="size-3.5 text-muted" strokeWidth={2} />
            Workspace
          </CommandItem>
          <CommandItem
            value="page-settings"
            onSelect={() => {
              router.push("/settings");
              closePalette();
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-pill-hover"
          >
            <Settings className="size-3.5 text-muted" strokeWidth={2} />
            Settings
          </CommandItem>
          <CommandItem
            value="page-trash"
            onSelect={() => {
              router.push("/trash");
              closePalette();
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-pill-hover"
          >
            <Trash2 className="size-3.5 text-muted" strokeWidth={2} />
            Trash
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
