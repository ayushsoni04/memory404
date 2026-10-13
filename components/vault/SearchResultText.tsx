import { linkHostname, type LinkApiRow } from "@/lib/links";
import { visibleSearchNote } from "@/lib/search-note";

export default function SearchResultText({ link }: { link: LinkApiRow }) {
  const note = visibleSearchNote(link.notes);
  return (
    <>
      <span className="truncate">{link.displayTitle || link.title}</span>
      {note ? (
        <span className="line-clamp-2 text-[12px] leading-snug text-muted">{note}</span>
      ) : null}
      <span className="truncate text-[11px] text-subtle">{linkHostname(link.url)}</span>
    </>
  );
}
