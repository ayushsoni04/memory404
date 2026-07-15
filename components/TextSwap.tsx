"use client";

import { useEffect, useRef, useState } from "react";

export default function TextSwap({ children }: { children: string }) {
  const [displayText, setDisplayText] = useState(children);
  const elRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (children === displayText) return;
    const el = elRef.current;
    if (!el) {
      setDisplayText(children);
      return;
    }

    el.classList.add("is-exit");
    const t = setTimeout(() => {
      setDisplayText(children);
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight; // force reflow
      el.classList.remove("is-enter-start");
    }, 150); // matching --text-swap-dur 150ms

    return () => clearTimeout(t);
  }, [children, displayText]);

  return (
    <span ref={elRef} className="t-text-swap">
      {displayText}
    </span>
  );
}
