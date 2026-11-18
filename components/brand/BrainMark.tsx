"use client";

import { useEffect, useRef } from "react";
import type { BrainScene } from "./brainScene";

type Props = {
  width?: number;
  height?: number;
  /** Bump to play the lift-and-tilt. */
  pulse: number;
  /** WebGL unavailable: the wordmark shows its text instead. */
  onFail?: () => void;
};

/**
 * The rotating 3D brain in the wordmark. three.js loads on demand; the brain
 * turns slowly on its own and holds still for reduced motion.
 */
export function BrainMark({ width = 46, height = 38, pulse, onFail }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const reduceRef = useRef(false);
  const onFailRef = useRef(onFail);

  useEffect(() => {
    onFailRef.current = onFail;
  }, [onFail]);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    reduceRef.current = reduce;

    void import("./brainScene")
      .then(({ createBrainScene }) => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        let scene: BrainScene;
        try {
          scene = createBrainScene(canvas);
        } catch {
          onFailRef.current?.();
          return;
        }
        sceneRef.current = scene;
        scene.resize(width, height);
        if (reduce) {
          scene.frame(performance.now(), false);
          return;
        }
        // rAF stops on its own while the tab is hidden.
        const loop = (now: number) => {
          scene.frame(now, true);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => onFailRef.current?.());

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [width, height]);

  useEffect(() => {
    if (pulse === 0 || reduceRef.current) return;
    sceneRef.current?.pulse(performance.now());
  }, [pulse]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ width, height }} aria-hidden />;
}
