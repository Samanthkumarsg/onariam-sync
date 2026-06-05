"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind `md` — below 768px is treated as mobile. */
const MOBILE_MAX_WIDTH = 767;

function getIsMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}
