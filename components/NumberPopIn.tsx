"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: number | string;
  className?: string;
};

export default function NumberPopIn({ children, className }: Props) {
  const valueStr = String(children);
  const [displayValue, setDisplayValue] = useState(valueStr);
  const groupRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (valueStr === displayValue) return;

    const group = groupRef.current;
    if (!group) {
      setDisplayValue(valueStr);
      return;
    }

    // Remove is-animating, update the value, and force a reflow
    group.classList.remove("is-animating");
    setDisplayValue(valueStr);

    const raf = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (group) {
          void group.offsetHeight; // force reflow
          group.classList.add("is-animating");
        }
      });
      return () => cancelAnimationFrame(raf2);
    });

    return () => cancelAnimationFrame(raf);
  }, [valueStr, displayValue]);

  // Ensure is-animating is present on initial mount
  useEffect(() => {
    const group = groupRef.current;
    if (group) {
      group.classList.add("is-animating");
    }
  }, []);

  const chars = displayValue.split("");

  return (
    <span
      ref={groupRef}
      className={`t-digit-group is-animating ${className || ""}`}
    >
      {chars.map((char, index) => {
        let stagger: string | undefined;
        if (index === chars.length - 2) stagger = "1";
        else if (index === chars.length - 1) stagger = "2";

        return (
          <span key={index} className="t-digit" data-stagger={stagger}>
            {char}
          </span>
        );
      })}
    </span>
  );
}
