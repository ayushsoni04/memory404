import { linkHostname, type LinkApiRow } from "@/lib/links";
import { visibleSearchNote } from "@/lib/search-note";

export default function SearchResultText({
  link,
  groupLabel = null,
}: {
  link: LinkApiRow;
  /** Collection this link lives in, when the palette knows it. */
  groupLabel?: string | null;
}) {
  const note = visibleSearchNote(link.notes);
  return (
    <>
      <span className="truncate">{link.displayTitle || link.title}</span>
      {note ? (
        <span className="line-clamp-2 text-[12px] leading-snug text-muted">{note}</span>
      ) : null}
      <span className="truncate text-[11px] text-subtle">
        {groupLabel ? `${linkHostname(link.url)} · in ${groupLabel}` : linkHostname(link.url)}
      </span>
    </>
  );
}
