"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up to `target` — from 0 on first mount (the
 * "Piggy proudly shows its savings" moment on page load), and from
 * whatever it currently shows on every later change (e.g. right after
 * Add/Take Money updates the balance). Runs via requestAnimationFrame,
 * never setInterval, so it stays smooth and pauses cleanly with the tab.
 * Jumps straight to `target` with no animation under prefers-reduced-motion.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      valueRef.current = target;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target);
      return;
    }

    const from = valueRef.current;
    const delta = target - from;
    if (delta === 0) return;

    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + delta * eased);
      valueRef.current = next;
      setValue(next);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return value;
}
