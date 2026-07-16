"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export default function TextSwap({ children }: { children: string }) {
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? "translateY(0)" : "translateY(4px)";

  return (
    <span className="relative inline-grid">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={children}
          initial={{ opacity: 0, transform: offset }}
          animate={{ opacity: 1, transform: "translateY(0)" }}
          exit={{
            opacity: 0,
            transform: reduceMotion ? "translateY(0)" : "translateY(-4px)",
          }}
          transition={{ duration: 0.15, ease: [0.77, 0, 0.175, 1] }}
          className="col-start-1 row-start-1 inline-block"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
