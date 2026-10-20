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
  const title = link.displayTitle || link.title;
  const place = groupLabel
    ? `${linkHostname(link.url)} · in ${groupLabel}`
    : linkHostname(link.url);
  return (
    <>
      <span className="block min-w-0 truncate" title={title}>
        {title}
      </span>
      {note ? (
        <span
          className="line-clamp-2 min-w-0 text-[12px] leading-snug text-muted [overflow-wrap:anywhere]"
          title={note}
        >
          {note}
        </span>
      ) : null}
      <span className="block min-w-0 truncate text-[11px] text-subtle" title={place}>
        {place}
      </span>
    </>
  );
}
