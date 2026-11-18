import Link from "next/link";
import { PlasmaOrb } from "./PlasmaOrb";
import "./brand-fonts.css";

/**
 * The memory404 mark, after designeer.xyz: the dithered plasma orb (hover it
 * for the colour sweep) beside a Geist Pixel wordmark, "memory" in ink and
 * "404" in the secondary grey.
 */
export function Wordmark({ orbSize = 28, className = "" }: { orbSize?: number; className?: string }) {
  return (
    <Link href="/" aria-label="memory404, home" className={`brand-mark tap ${className}`}>
      <PlasmaOrb size={orbSize} />
      <span className="brand-word font-pixel">
        memory<span className="brand-word-dim">404</span>
      </span>
    </Link>
  );
}
