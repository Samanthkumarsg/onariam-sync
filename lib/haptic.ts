/** Light haptic feedback for reward moments (mobile; no-op elsewhere). */

export type HapticKind = "light" | "success" | "celebrate";

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 12,
  success: [12, 45, 18],
  celebrate: [18, 55, 22, 55, 28],
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/** Fire haptic on phones/tablets; respects reduced motion. */
export function haptic(kind: HapticKind = "light"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  if (!isCoarsePointer() || prefersReducedMotion()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* unsupported */
  }
}
