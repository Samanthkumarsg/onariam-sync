/** Lightweight summarization via Transformers.js (browser-only fallback). */

import { formatWebAIError } from "@/lib/webai-client";

const SUMMARIZER_MODEL = "Xenova/distilbart-cnn-12-6";

type SummarizerPipeline = (
  text: string,
  options?: { max_new_tokens?: number; min_length?: number }
) => Promise<{ summary_text: string }[]>;

let pipelinePromise: Promise<SummarizerPipeline> | null = null;

export async function loadSummarizer(
  onProgress?: (pct: number) => void
): Promise<SummarizerPipeline> {
  if (typeof window === "undefined") {
    throw new Error("Local AI runs in the browser only");
  }

  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      onProgress?.(5);

      const pipe = await pipeline("summarization", SUMMARIZER_MODEL, {
        progress_callback: (info) => {
          if (
            info.status === "progress" &&
            typeof info.progress === "number"
          ) {
            onProgress?.(Math.round(info.progress));
          }
        },
      });

      onProgress?.(100);
      return pipe as SummarizerPipeline;
    })();
  }

  return pipelinePromise;
}

export async function summarizeWithTransformers(
  text: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const pipe = await loadSummarizer(onProgress);
  const input =
    trimmed.length > 1024 ? `${trimmed.slice(0, 1024)}…` : trimmed;

  try {
    const result = await pipe(input, {
      max_new_tokens: 80,
      min_length: 8,
    });
    return result[0]?.summary_text?.trim() ?? "";
  } catch (e) {
    throw new Error(formatWebAIError(e));
  }
}

export function resetSummarizer() {
  pipelinePromise = null;
}
