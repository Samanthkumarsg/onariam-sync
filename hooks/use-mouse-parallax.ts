"use client";

import { useEffect, useState } from "react";

type Parallax = { x: number; y: number };

const LERP = 0.09;

export function useMouseParallax(enabled = true): Parallax {
  const [parallax, setParallax] = useState<Parallax>({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      setParallax({ x: 0, y: 0 });
      return;
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };

    const tick = () => {
      current.x += (target.x - current.x) * LERP;
      current.y += (target.y - current.y) * LERP;
      setParallax({ x: current.x, y: current.y });
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  return parallax;
}
