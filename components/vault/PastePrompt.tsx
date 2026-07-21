"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import type { LinkApiRow } from "@/lib/links";
import { applyShellStroke, clearShellStroke } from "@/lib/card-vicinity-stroke";
import { FIELD_CLASS } from "./types";

type Props = {
  groupId: string | null;
  variant: "empty" | "end";
  onSaved: (link: LinkApiRow) => void;
  saveLink: (
    url: string,
    groupId: string,
  ) => Promise<{ ok: true; link: LinkApiRow } | { ok: false; error: string }>;
};

type Phase = "idle" | "saving" | "success" | "notes";

/** Curved arrow + “Paste” cue from compress.lochie.me, wired to the vault paste input. */
export default function PastePrompt({
  groupId,
  variant,
  onSaved,
  saveLink,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [timerActive, setTimerActive] = useState(false);
  const [savedLink, setSavedLink] = useState<LinkApiRow | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const saveGen = useRef(0);

  const finishFlow = useCallback(async () => {
    if (!savedLink) return;
    setTimerActive(false);
    let finalLink = savedLink;
    if (notes.trim()) {
      try {
        const res = await fetch(`/api/links/${savedLink.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notes.trim() }),
        });
        const data = await res.json();
        if (res.ok && data.link) {
          finalLink = data.link;
        }
      } catch (e) {
        console.error("Failed to save notes:", e);
      }
    }
    onSaved(finalLink);
    setUrl("");
    setNotes("");
    setSavedLink(null);
    setPhase("idle");
    setError(null);
  }, [notes, onSaved, savedLink]);

  useEffect(() => {
    if (!timerActive || countdown <= 0) {
      if (timerActive && countdown === 0) {
        const timer = window.setTimeout(() => void finishFlow(), 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, finishFlow, timerActive]);

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a URL");
      return;
    }
    if (!groupId) {
      setError("No group selected");
      return;
    }

    const gen = ++saveGen.current;
    setPhase("saving");
    setError(null);

    try {
      const result = await saveLink(trimmed, groupId);
      if (gen !== saveGen.current) return;
      if (!result.ok) {
        setError(result.error);
        setPhase("idle");
        return;
      }

      setPhase("success");
      setSavedLink(result.link);
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (gen === saveGen.current) {
        setUrl("");
        setCountdown(5);
        setTimerActive(true);
        setPhase("notes");
      }
    } catch {
      if (gen !== saveGen.current) return;
      setError("Network error — try again");
      setPhase("idle");
    }
  };

  return (
    <div
      className={
        variant === "empty"
          ? "flex w-full flex-1 flex-col items-center justify-center px-4 py-16"
          : "mt-16 flex w-full flex-col items-center justify-center px-4 pb-8 pt-8"
      }
    >
      <div className="paste-prompt relative w-full max-w-[28rem]">
        <PasteArrow reduceMotion={!!reduceMotion} />

        <div
          className="mind-card-shell paste-prompt-dropzone group relative flex min-h-[10.5rem] flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed border-muted/50 bg-transparent px-5 py-8 text-muted transition-colors duration-[100ms] ease-out hover:border-foreground/35 hover:text-foreground"
          data-status={phase === "idle" ? "idle" : "busy"}
          onPointerMove={(e) => {
            applyShellStroke(e.currentTarget, e.clientX, e.clientY);
          }}
          onPointerLeave={(e) => {
            clearShellStroke(e.currentTarget);
          }}
        >
          <span className="mind-card-stroke" aria-hidden />

          {phase === "saving" || phase === "success" ? (
            <div className="relative z-[2] flex flex-col items-center justify-center gap-2">
              {phase === "success" ? (
                <>
                  <span
                    className="t-success-check"
                    data-state="in"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--success)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-10"
                    >
                      <path
                        d="M20 6L9 17L4 12"
                        style={{ strokeDasharray: 24, strokeDashoffset: 24 }}
                      />
                    </svg>
                  </span>
                  <span className="text-[12px] font-medium text-success">
                    Link added!
                  </span>
                </>
              ) : (
                <ThinkingOrb state="searching" size={64} speed={0.95} />
              )}
            </div>
          ) : phase === "notes" ? (
            <div className="relative z-[2] flex w-full flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">
                  {timerActive
                    ? `Add notes (auto-done in ${countdown}s)`
                    : "Add notes"}
                </span>
                {timerActive ? (
                  <button
                    type="button"
                    onClick={() => setTimerActive(false)}
                    className="text-[11px] text-muted hover:underline"
                  >
                    Pause
                  </button>
                ) : null}
              </div>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setTimerActive(false);
                }}
                onFocus={() => setTimerActive(false)}
                placeholder="Add optional notes here..."
                rows={2}
                className={`${FIELD_CLASS} resize-none`}
              />
              <button
                type="button"
                onClick={() => void finishFlow()}
                className="inline-flex h-8 items-center justify-center self-start rounded-full bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg"
              >
                {notes.trim() ? "Save Notes" : "Done"}
              </button>
            </div>
          ) : (
            <form
              className="relative z-[2] flex w-full flex-col items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <p className="text-center text-[13px] text-muted">
                <span className="relative inline-block text-foreground">
                  Save webpages
                </span>{" "}
                worth coming back to.
              </p>
              <div className="flex w-full items-center gap-2">
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste a URL to save"
                  disabled={!groupId}
                  className={`${FIELD_CLASS} flex-1`}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!url.trim() || !groupId}
                  className="flex size-[38px] min-w-[38px] items-center justify-center rounded-full bg-pill-active text-pill-active-fg transition-[transform,opacity] duration-[160ms] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                  aria-label="Add link"
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                </button>
              </div>
              {error ? (
                <p className="w-full text-left text-[11px] text-danger">{error}</p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PasteArrow({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <svg
      className="paste-prompt-arrow pointer-events-none absolute right-full mr-6 hidden overflow-visible md:block"
      width="110"
      height="71"
      viewBox="0 0 110 71"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Label first, then arrow draws out from it toward the dropzone */}
      <motion.g
        initial={
          reduceMotion
            ? { scale: 1, opacity: 1, rotate: -3.93 }
            : { scale: 0.8, opacity: 0, rotate: 0 }
        }
        animate={{ scale: 1, opacity: 1, rotate: -3.93 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                delay: 0.1,
                type: "spring",
                mass: 0.04,
                stiffness: 20,
                damping: 0.5,
                velocity: 8,
              }
        }
        style={{ transformOrigin: "36px 14px" }}
      >
        <text
          x="0"
          y="18"
          fill="currentColor"
          className="text-foreground"
          style={{
            fontFamily:
              "var(--font-display), ui-sans-serif, system-ui, sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          save now
        </text>
      </motion.g>
      <motion.path
        d="M53.6593 26.2516C52.4551 32.5065 50.2839 53.3288 62.6499 52.8658C66.1523 52.7347 71.5266 48.3861 69.2462 44.3612C66.2053 38.9941 59.7072 45.2658 59.1662 49.1103C57.7409 59.2382 68.6314 67.5149 77.3631 69.3907C84.6958 70.9659 92.4421 68.6904 99.0565 65.618C102.159 64.1768 104.161 61.5969 107.07 60.0399C111.572 57.6311 106.851 63.0701 105.925 65.6942C104.033 71.056 106.835 62.2544 107.499 60.4096C108.593 57.3657 100.528 56.6824 97.5443 55.9248"
        stroke="currentColor"
        className="text-foreground"
        strokeWidth="2"
        strokeLinecap="round"
        initial={
          reduceMotion
            ? { strokeDasharray: 200, strokeDashoffset: 400 }
            : { strokeDasharray: 200, strokeDashoffset: 600 }
        }
        animate={
          reduceMotion
            ? { strokeDasharray: 200, strokeDashoffset: 400 }
            : { strokeDasharray: [200, 200], strokeDashoffset: [600, 400] }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { delay: 0.55, duration: 1, ease: "easeOut" }
        }
      />
    </svg>
  );
}
