/** Heuristics for choosing a local AI backend (WebAI LLM is skipped on many phones). */

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;

  if (MOBILE_UA.test(navigator.userAgent)) return true;

  const coarse =
    window.matchMedia("(pointer: coarse)").matches &&
    window.matchMedia("(max-width: 768px)").matches;

  return coarse;
}

export function isLowMemoryDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof mem === "number" && mem > 0 && mem < 4;
}

/** Llama-class WebAI models are unreliable on phones and low-RAM devices. */
export function shouldSkipWebAI(): boolean {
  return isMobileDevice() || isLowMemoryDevice();
}

export function prefersWasmOnlyWebAI(): boolean {
  return shouldSkipWebAI() || isMobileDevice();
}
