/** Microsoft Edge built-in Summarizer API (Phi-4-mini, on-device). */

import type { LocalAiHandle } from "@/lib/local-ai-handle";
import { extractUserPrompt } from "@/lib/local-ai-handle";

function isEdgeSummarizerSupported(): boolean {
  return typeof window !== "undefined" && typeof Summarizer !== "undefined";
}

async function summarizerAvailability(): Promise<EdgeAiAvailability | "missing"> {
  if (!isEdgeSummarizerSupported()) return "missing";
  try {
    return await Summarizer!.availability();
  } catch {
    return "unavailable";
  }
}

function isMicrosoftEdge(): boolean {
  if (typeof navigator === "undefined") return false;
  return /\bEdg\//.test(navigator.userAgent);
}

export async function canUseEdgeSummarizer(): Promise<boolean> {
  if (!isMicrosoftEdge()) return false;
  const status = await summarizerAvailability();
  return (
    status === "available" ||
    status === "readily" ||
    status === "downloadable" ||
    status === "downloading"
  );
}

export async function createEdgeSummarizerHandle(
  onDownloadProgress?: (pct: number) => void
): Promise<LocalAiHandle> {
  if (!isEdgeSummarizerSupported()) {
    throw new Error("Edge built-in AI is not available in this browser");
  }

  const status = await Summarizer!.availability();
  if (status === "unavailable") {
    throw new Error("Edge built-in summarizer is unavailable on this device");
  }

  const session = await Summarizer!.create({
    type: "tl;dr",
    length: "short",
    format: "plain-text",
    sharedContext: "Clipboard notes shared in a sync session",
    monitor(event) {
      if (!event.total) return;
      onDownloadProgress?.(
        Math.min(100, Math.round((event.loaded / event.total) * 100))
      );
    },
  });

  onDownloadProgress?.(100);

  return {
    engine: "edge",
    async summarize(prompt: string) {
      const text = extractUserPrompt(prompt);
      if (!text) return "";
      return session.summarize(text, {
        context: "A short clipboard note from a sync session.",
      });
    },
    terminate() {
      session.destroy();
    },
  };
}
