"use client";

import { useEffect, useRef, useState } from "react";

export function useSmoothedValue(target: number, lerp = 0.1): number {
  const [value, setValue] = useState(target);
  const currentRef = useRef(target);
  const targetRef = useRef(target);

  targetRef.current = target;

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduced) {
      currentRef.current = target;
      setValue(target);
      return;
    }

    let raf = 0;

    const tick = () => {
      const t = targetRef.current;
      const c = currentRef.current;
      const next = c + (t - c) * lerp;
      currentRef.current = Math.abs(t - next) < 0.002 ? t : next;
      setValue(currentRef.current);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lerp]);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) {
      currentRef.current = target;
      setValue(target);
    }
  }, [target]);

  return value;
}
