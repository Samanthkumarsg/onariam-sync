/** Pick and load the best available on-device summarization backend. */

import { shouldSkipWebAI } from "@/lib/ai-device";
import {
  canUseEdgeSummarizer,
  createEdgeSummarizerHandle,
} from "@/lib/edge-ai-summarize";
import type { LocalAiHandle } from "@/lib/local-ai-handle";
import { createTransformersHandle } from "@/lib/local-ai-summarize";
import {
  createWebAIHandle,
  formatWebAIError,
  isWebAIConfigurationError,
} from "@/lib/webai-client";
import { WEBAI_SESSION_MODEL_ID_SMALL } from "@/lib/webai-config";

const WEBAI_INIT_TIMEOUT_MS = 90_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function createLocalAiHandle(
  onProgress?: (pct: number) => void
): Promise<LocalAiHandle> {
  const errors: unknown[] = [];

  if (await canUseEdgeSummarizer()) {
    try {
      return await createEdgeSummarizerHandle(onProgress);
    } catch (edgeError) {
      console.warn("[LocalAI] Edge summarizer failed", edgeError);
      errors.push(edgeError);
    }
  }

  try {
    return await createTransformersHandle(onProgress);
  } catch (transformersError) {
    console.warn("[LocalAI] Transformers.js failed", transformersError);
    errors.push(transformersError);
  }

  if (!shouldSkipWebAI()) {
    try {
      return await withTimeout(
        createWebAIHandle(WEBAI_SESSION_MODEL_ID_SMALL, onProgress),
        WEBAI_INIT_TIMEOUT_MS,
        "Local LLM load timed out — try again on Wi‑Fi or use a lighter browser."
      );
    } catch (webaiError) {
      console.warn("[LocalAI] WebAI failed", webaiError);
      errors.push(webaiError);
    }
  }

  const message =
    formatWebAIError(errors.find((e) => !isWebAIConfigurationError(e))) ||
    formatWebAIError(errors[errors.length - 1]) ||
    "Could not load local AI. Check your connection and try again.";
  throw new Error(message);
}
