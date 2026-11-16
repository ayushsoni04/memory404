"use client";

/** Strip order per cell: a dash for unused leading places, then 0–9. */
const STRIP = ["—", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
/** Always three places; a fourth only appears once the count reaches a thousand. */
const MIN_CELLS = 3;
/** Matches the heading globe so a group switch moves as one. */
const ROLL_MS = 560;

type Props = {
  count: number;
  className?: string;
};

function cellIndexes(count: number): number[] {
  const safe = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  const digits = String(safe);
  const cells = Math.max(MIN_CELLS, digits.length);
  const padded = digits.padStart(cells, " ");
  // Leading spaces become the dash (index 0); digits land at index d + 1.
  return [...padded].map((ch) => (ch === " " ? 0 : Number(ch) + 1));
}

/** One rolling place: a blurred, dimmed copy for the peeking neighbours and a sharp copy for the middle. */
function Cell({ index }: { index: number }) {
  const strip = (
    <span
      className="absolute inset-x-0 top-0 flex flex-col items-center transition-transform ease-[var(--ease-in-out-cubic)] motion-reduce:transition-none"
      style={{
        transform: `translateY(calc(var(--odo-peek) - ${index} * var(--odo-h)))`,
        transitionDuration: `${ROLL_MS}ms`,
      }}
    >
      {STRIP.map((glyph, i) => (
        <span
          key={i}
          className="flex w-full items-center justify-center"
          style={{ height: "var(--odo-h)" }}
        >
          {glyph === "—" ? (
            <span className="block h-px w-[60%] bg-current opacity-40" />
          ) : (
            glyph
          )}
        </span>
      ))}
    </span>
  );

  return (
    <span className="relative block h-full w-[var(--odo-w)] overflow-hidden border-l border-white/[0.06] first:border-l-0">
      {/* Neighbours above and below: soft and dim, like the far side of a drum. */}
      <span className="absolute inset-0 opacity-60 blur-[1.2px]">{strip}</span>
      {/* The current digit: sharp, only in the middle band. */}
      <span
        className="absolute inset-0"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 22%, #000 34%, #000 66%, transparent 78%)",
        }}
      >
        {strip}
      </span>
    </span>
  );
}

/**
 * Mechanical-counter readout of how many links are in the open group.
 * Each place rolls to its new digit; unused leading places show a dash.
 */
export function LinkOdometer({ count, className = "" }: Props) {
  const cells = cellIndexes(count);
  const safe = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;

  return (
    <span
      className={`link-odometer relative inline-flex select-none overflow-hidden rounded-[9px] bg-[linear-gradient(to_bottom,#262626,#0d0d0d_55%,#161616)] font-mono text-[18px] font-medium leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_18px_rgba(0,0,0,0.35)] ${className}`}
      style={
        {
          "--odo-h": "24px",
          "--odo-w": "19px",
          // Height comes from --odo-size so a style can match it to its neighbours.
          "--odo-peek": "calc((var(--odo-size, 44px) - var(--odo-h)) / 2)",
          height: "var(--odo-size, 44px)",
          paddingInline: "4px",
        } as React.CSSProperties
      }
    >
      <span className="sr-only">
        {safe} {safe === 1 ? "link" : "links"}
      </span>
      <span aria-hidden className="flex h-full">
        {cells.map((index, place) => (
          // Keyed from the right so units stay the units when a digit is added.
          <Cell key={cells.length - place} index={index} />
        ))}
      </span>
      {/* Top and bottom shading so the cells read as curved. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent_32%,transparent_68%,rgba(0,0,0,0.6))]"
      />
    </span>
  );
}
