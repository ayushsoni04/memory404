/**
 * Backdrop for the sidebar in the Signal art style: an eclipse orb, a grid,
 * and a halftone 404 mark. Decorative only, and
 * hidden by CSS unless <html data-art="signal">.
 */

import { SignalMetaRow } from "./SignalMetaRow";

export { SignalMetaRow };

/** Hex readout, e.g. 7 -> "0X07". */
export function hexReadout(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  return `0X${safe.toString(16).toUpperCase().padStart(2, "0")}`;
}

/** Zero-padded count, e.g. 128 -> "0128". */
export function countReadout(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  return String(safe).padStart(4, "0");
}

export default function SignalPoster() {
  return (
    <div className="sig-poster art-only" aria-hidden>
      <div className="sig-poster-orb" />
      <div className="sig-poster-grid" />
      <div className="sig-poster-mark">
        <div className="sig-mark" data-text="404">
          <span className="sig-mark-dots" />
        </div>
        <span className="sig-badge">Link archive</span>
      </div>
    </div>
  );
}
