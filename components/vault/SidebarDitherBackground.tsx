import SignalPoster from "./SignalPoster";
import { SidebarReadoutField } from "./SidebarReadoutField";

/**
 * Backdrop layer for the vault sidebar. The sidebar shares the page backdrop,
 * so this only carries the Signal poster.
 */
export default function SidebarDitherBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      aria-hidden
    >
      <SignalPoster />
      <SidebarReadoutField />
    </div>
  );
}
