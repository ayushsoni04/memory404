"use client";

import { useEffect, useState } from "react";

/** Tracks Caps Lock from key events. The state is unknown until the first key. */
export function useCapsLock(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = (event: KeyboardEvent) => {
      if (typeof event.getModifierState !== "function") return;
      setOn(event.getModifierState("CapsLock"));
    };
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
    };
  }, []);

  return on;
}

/** Shown under a focused password field when Caps Lock is on. */
export function CapsLockHint({ active }: { active: boolean }) {
  const on = useCapsLock();
  if (!active || !on) return null;
  return (
    <p className="text-[11px] text-subtle" role="status">
      Caps Lock is on.
    </p>
  );
}
