"use client";

import { useEffect, useRef, useState } from "react";

/** Slow ease toward 0 or 1 — magnetic gather / release */
const PULL_LERP = 0.055;
const PULL_LERP_FAST = 0.14;

export function useMagnetPull(active: boolean, fast = false): number {
  const [pull, setPull] = useState(0);
  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const fastRef = useRef(fast);

  targetRef.current = active ? 1 : 0;
  fastRef.current = fast;

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduced) {
      const v = targetRef.current;
      currentRef.current = v;
      setPull(v);
      return;
    }

    let raf = 0;

    const tick = () => {
      const target = targetRef.current;
      const current = currentRef.current;
      const lerp = fastRef.current ? PULL_LERP_FAST : PULL_LERP;
      const next = current + (target - current) * lerp;
      currentRef.current =
        Math.abs(target - next) < 0.002 ? target : next;
      setPull(currentRef.current);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) {
      const v = active ? 1 : 0;
      currentRef.current = v;
      setPull(v);
    }
  }, [active]);

  return pull;
}
